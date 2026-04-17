import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import { connectDB } from '../src/utils/db';
import { User } from '../src/models/User';
import { Business } from '../src/models/Business';
import { Product } from '../src/models/Product';
import { Sale, PaymentMethod } from '../src/models/Sale';
import { Payment } from '../src/models/Payment';
import { Expense } from '../src/models/Expense';

interface SeedProduct {
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  currentStock: number;
  lowStockThreshold: number;
}

interface SeedSaleItem {
  sku: string;
  quantity: number;
}

interface SeedSale {
  items: SeedSaleItem[];
  paymentMethod: PaymentMethod;
  createdAt: string;
}

interface SeedPayment {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  createdAt: string;
}

interface SeedExpense {
  amount: number;
  category: string;
  description?: string;
  createdAt: string;
}

interface SeedFile {
  business?: { name?: string; currency?: string; timezone?: string };
  products: SeedProduct[];
  sales: SeedSale[];
  payments: SeedPayment[];
  expenses: SeedExpense[];
}

function parseArgs() {
  const args = process.argv.slice(2);
  let email = 'test@gmail.com';
  let reset = false;
  let purge = false;
  let file = 'seed-data.json';
  let password = 'changeme123';
  let businessName: string | undefined;
  for (const a of args) {
    if (a === '--reset') reset = true;
    else if (a === '--purge') purge = true;
    else if (a.startsWith('--email=')) email = a.slice('--email='.length).trim();
    else if (a.startsWith('--file=')) file = a.slice('--file='.length).trim();
    else if (a.startsWith('--password=')) password = a.slice('--password='.length).trim();
    else if (a.startsWith('--business-name=')) businessName = a.slice('--business-name='.length).trim();
  }
  return { email, reset, purge, file, password, businessName };
}

async function main() {
  const { email, reset, purge, file, password, businessName } = parseArgs();
  const dataPath = path.resolve(__dirname, '..', file);
  const raw = fs.readFileSync(dataPath, 'utf8');
  const data: SeedFile = JSON.parse(raw);

  await connectDB();

  if (purge) {
    console.log('[seed] --purge: wiping ALL users, businesses, products, sales, payments, expenses...');
    const [du, db, dp, ds, dpay, de] = await Promise.all([
      User.deleteMany({}),
      Business.deleteMany({}),
      Product.deleteMany({}),
      Sale.deleteMany({}),
      Payment.deleteMany({}),
      Expense.deleteMany({}),
    ]);
    console.log(
      `[seed] purged — users=${du.deletedCount} businesses=${db.deletedCount} products=${dp.deletedCount} sales=${ds.deletedCount} payments=${dpay.deletedCount} expenses=${de.deletedCount}`
    );
  }

  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });
  const currency = data.business?.currency || 'USD';
  const timezone = data.business?.timezone || 'UTC';
  const resolvedBizName = businessName || data.business?.name || 'My Business';

  if (!user) {
    console.log(`[seed] no user with email "${normalizedEmail}" — creating user + business...`);
    const passwordHash = await bcrypt.hash(password, 12);
    const businessId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    user = await User.create({
      _id: userId,
      email: normalizedEmail,
      passwordHash,
      role: 'OWNER',
      businessId,
    });
    await Business.create({
      _id: businessId,
      name: resolvedBizName,
      owner: userId,
      currency,
      timezone,
    });
    console.log(`[seed] created user ${normalizedEmail} (password: ${password})`);
    console.log(`[seed] created business "${resolvedBizName}" ${businessId}`);
  } else {
    await Business.updateOne(
      { _id: user.businessId },
      { $set: { currency, timezone, ...(businessName ? { name: businessName } : {}) } }
    );
    console.log(`[seed] existing user ${normalizedEmail} — updated business ${user.businessId} currency=${currency}`);
  }

  const businessId = user.businessId;

  if (reset) {
    const [dp, ds, dpay, de] = await Promise.all([
      Product.deleteMany({ businessId }),
      Sale.deleteMany({ businessId }),
      Payment.deleteMany({ businessId }),
      Expense.deleteMany({ businessId }),
    ]);
    console.log(
      `[seed] reset — removed ${dp.deletedCount} products, ${ds.deletedCount} sales, ${dpay.deletedCount} payments, ${de.deletedCount} expenses`
    );
  }

  // Upsert products
  const productOps = data.products.map((p) => ({
    updateOne: {
      filter: { businessId, sku: p.sku },
      update: {
        $set: {
          name: p.name,
          category: p.category,
          unitPrice: p.unitPrice,
          costPrice: p.costPrice,
          currentStock: p.currentStock,
          lowStockThreshold: p.lowStockThreshold,
          businessId,
        },
      },
      upsert: true,
    },
  }));
  if (productOps.length) {
    const res = await Product.bulkWrite(productOps);
    console.log(
      `[seed] products: upserted=${res.upsertedCount} modified=${res.modifiedCount} matched=${res.matchedCount}`
    );
  }

  const productsBySku = new Map<string, { _id: Types.ObjectId; name: string; unitPrice: number }>();
  const productsForBusiness = await Product.find({ businessId }).lean();
  for (const p of productsForBusiness) {
    productsBySku.set(p.sku, { _id: p._id, name: p.name, unitPrice: p.unitPrice });
  }

  // Sales
  if (data.sales.length) {
    const saleDocs = [];
    let skipped = 0;
    for (const s of data.sales) {
      const items = [];
      let total = 0;
      let ok = true;
      for (const it of s.items) {
        const p = productsBySku.get(it.sku);
        if (!p) {
          console.warn(`[seed] sale references unknown SKU "${it.sku}" — skipping sale`);
          ok = false;
          break;
        }
        items.push({
          productId: p._id,
          productName: p.name,
          quantity: it.quantity,
          unitPrice: p.unitPrice,
        });
        total += p.unitPrice * it.quantity;
      }
      if (!ok) {
        skipped++;
        continue;
      }
      const when = new Date(s.createdAt);
      saleDocs.push({
        items,
        totalAmount: total,
        paymentMethod: s.paymentMethod,
        staffId: user._id,
        businessId,
        createdAt: when,
        updatedAt: when,
      });
    }
    if (saleDocs.length) {
      await Sale.insertMany(saleDocs, { ordered: false });
    }
    console.log(`[seed] sales: inserted=${saleDocs.length} skipped=${skipped}`);
  }

  // Payments (schema requires amount >= 0 — convert negatives to expenses)
  if (data.payments.length) {
    const payDocs = [];
    const derivedExpenses = [];
    for (const p of data.payments) {
      const when = new Date(p.createdAt);
      if (p.amount < 0) {
        derivedExpenses.push({
          amount: Math.abs(p.amount),
          category: 'Fees',
          description: p.reference || 'Payment fee/loss',
          businessId,
          createdAt: when,
          updatedAt: when,
        });
        continue;
      }
      payDocs.push({
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        businessId,
        createdAt: when,
        updatedAt: when,
      });
    }
    if (payDocs.length) await Payment.insertMany(payDocs, { ordered: false });
    if (derivedExpenses.length) await Expense.insertMany(derivedExpenses, { ordered: false });
    console.log(
      `[seed] payments: inserted=${payDocs.length} (+${derivedExpenses.length} negative-amount payments recorded as Fees expenses)`
    );
  }

  // Expenses
  if (data.expenses.length) {
    const expDocs = data.expenses.map((e) => {
      const when = new Date(e.createdAt);
      return {
        amount: e.amount,
        category: e.category,
        description: e.description,
        businessId,
        createdAt: when,
        updatedAt: when,
      };
    });
    await Expense.insertMany(expDocs, { ordered: false });
    console.log(`[seed] expenses: inserted=${expDocs.length}`);
  }

  console.log('[seed] done.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[seed] failed:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
