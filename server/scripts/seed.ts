import 'dotenv/config';
import fs from 'fs';
import path from 'path';
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
  business?: { currency?: string; timezone?: string };
  products: SeedProduct[];
  sales: SeedSale[];
  payments: SeedPayment[];
  expenses: SeedExpense[];
}

function parseArgs() {
  const args = process.argv.slice(2);
  let email = 'test@gmail.com';
  let reset = false;
  for (const a of args) {
    if (a === '--reset') reset = true;
    else if (a.startsWith('--email=')) email = a.slice('--email='.length).trim();
  }
  return { email, reset };
}

async function main() {
  const { email, reset } = parseArgs();
  const dataPath = path.resolve(__dirname, '..', 'seed-data.json');
  const raw = fs.readFileSync(dataPath, 'utf8');
  const data: SeedFile = JSON.parse(raw);

  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`[seed] no user with email "${email}". Register through the app first, then re-run.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const businessId = user.businessId;
  const currency = data.business?.currency || 'EUR';
  const timezone = data.business?.timezone;

  await Business.updateOne(
    { _id: businessId },
    { $set: { currency, ...(timezone ? { timezone } : {}) } }
  );
  console.log(`[seed] business ${businessId} currency=${currency}`);

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
