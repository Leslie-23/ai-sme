import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Business } from '../models/Business';
import { Product } from '../models/Product';
import { Sale, PaymentMethod } from '../models/Sale';
import { Expense } from '../models/Expense';
import { Payment } from '../models/Payment';
import { InventoryRecord } from '../models/InventoryRecord';

type CatalogSeed = {
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  openingStock: number;
  lowStockThreshold: number;
};

type DemoSeedStatus = {
  running: boolean;
  progress: number;
  message: string;
  phase: string;
  updatedAt: string;
};

const catalog: CatalogSeed[] = [
  { name: 'TCL Smart TV 50', sku: 'TV-TCL-50', category: 'Electronics', unitPrice: 4500, costPrice: 3550, openingStock: 7, lowStockThreshold: 3 },
  { name: 'Samsung Microwave', sku: 'MW-SAM-01', category: 'Appliances', unitPrice: 1850, costPrice: 1400, openingStock: 4, lowStockThreshold: 3 },
  { name: 'Nasco Fridge/Freezer', sku: 'FR-NAS-01', category: 'Appliances', unitPrice: 2795, costPrice: 2180, openingStock: 5, lowStockThreshold: 2 },
  { name: 'Midea A/C Split', sku: 'AC-MID-SP', category: 'Cooling', unitPrice: 2400, costPrice: 1850, openingStock: 4, lowStockThreshold: 2 },
  { name: 'Bardefu Blender', sku: 'BL-BAR-02', category: 'Kitchen', unitPrice: 550, costPrice: 330, openingStock: 18, lowStockThreshold: 6 },
  { name: 'Oraimo Power Bank 20000', sku: 'PB-ORA-20', category: 'Accessories', unitPrice: 220, costPrice: 135, openingStock: 30, lowStockThreshold: 10 },
  { name: 'HP LaserJet Toner', sku: 'TN-HP-12A', category: 'Office', unitPrice: 380, costPrice: 260, openingStock: 12, lowStockThreshold: 5 },
  { name: 'Counting Machine', sku: 'CM-GEN-01', category: 'Office', unitPrice: 890, costPrice: 640, openingStock: 6, lowStockThreshold: 2 },
  { name: 'Samsung Sound Bar', sku: 'SB-SAM-01', category: 'Audio', unitPrice: 1250, costPrice: 920, openingStock: 7, lowStockThreshold: 2 },
  { name: 'Extension Cable 5m', sku: 'EL-EXT-5M', category: 'Accessories', unitPrice: 95, costPrice: 45, openingStock: 80, lowStockThreshold: 20 },
];

const monthlyExpenses = [
  { category: 'Rent', base: 2200, delta: 35, note: 'Monthly shop rent' },
  { category: 'Utilities', base: 380, delta: 12, note: 'Electricity and water' },
  { category: 'Staff', base: 1600, delta: 55, note: 'Part-time sales support' },
  { category: 'Transport', base: 250, delta: 18, note: 'Supplier delivery runs' },
  { category: 'Marketing', base: 240, delta: 15, note: 'Weekend promo flyers' },
  { category: 'Fees', base: 160, delta: 8, note: 'Payment and bank charges' },
];

const demoSeedStatus = new Map<string, DemoSeedStatus>();

function setSeedStatus(businessId: Types.ObjectId, status: Partial<DemoSeedStatus>): void {
  const key = businessId.toString();
  const current = demoSeedStatus.get(key);
  demoSeedStatus.set(key, {
    running: status.running ?? current?.running ?? false,
    progress: status.progress ?? current?.progress ?? 0,
    message: status.message ?? current?.message ?? 'Ready to start.',
    phase: status.phase ?? current?.phase ?? 'idle',
    updatedAt: new Date().toISOString(),
  });
}

function getMonthName(seedStart: Date, monthOffset: number): string {
  return new Date(seedStart.getFullYear(), monthOffset, 1).toLocaleString('en-US', { month: 'long' });
}

function seedStartDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear() - 1, 0, 1);
}

function monthDate(seedStart: Date, monthOffset: number, day: number, hour = 10): Date {
  return new Date(seedStart.getFullYear(), monthOffset, day, hour, 15, 0, 0);
}

function planQty(base: number, monthOffset: number, ramp = 0.2): number {
  return Math.max(1, Math.round(base + monthOffset * ramp));
}

export function getDemoSeedStatus(req: Request, res: Response): void {
  const key = req.auth!.businessId.toString();
  const current =
    demoSeedStatus.get(key) || ({
      running: false,
      progress: 0,
      message: 'Ready to start.',
      phase: 'idle',
      updatedAt: new Date().toISOString(),
    } satisfies DemoSeedStatus);
  res.json(current);
}

export async function seedDemoBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.auth!.businessId;
    const userId = req.auth!.userId;
    const seedStart = seedStartDate();
    const stockBySku = new Map<string, number>(catalog.map((p) => [p.sku, p.openingStock]));
    const bySku: Map<string, { _id: Types.ObjectId; name: string; unitPrice: number }> = new Map();
    let salesCount = 0;
    let expenseCount = 0;
    let paymentCount = 0;
    let inventoryCount = 0;

    setSeedStatus(businessId, {
      running: true,
      progress: 2,
      phase: 'clearing',
      message: 'Clearing current workspace data.',
    });

    await Promise.all([
      Product.deleteMany({ businessId }),
      Sale.deleteMany({ businessId }),
      Expense.deleteMany({ businessId }),
      Payment.deleteMany({ businessId }),
      InventoryRecord.deleteMany({ businessId }),
    ]);

    await Business.findByIdAndUpdate(businessId, {
      $set: {
        name: 'Demo Electronics Shop',
        businessType: 'retail',
        currency: 'USD',
        categories: ['Electronics', 'Appliances', 'Cooling', 'Kitchen', 'Accessories', 'Office', 'Audio'],
      },
    });

    setSeedStatus(businessId, {
      running: true,
      progress: 12,
      phase: 'catalog',
      message: 'Creating the demo product catalog.',
    });

    const created = await Product.insertMany(
      catalog.map((p) => ({
        _id: new Types.ObjectId(),
        name: p.name,
        sku: p.sku,
        category: p.category,
        unitPrice: p.unitPrice,
        costPrice: p.costPrice,
        currentStock: p.openingStock,
        lowStockThreshold: p.lowStockThreshold,
        businessId,
      }))
    );
    created.forEach((p) => {
      bySku.set(p.sku, { _id: p._id, name: p.name, unitPrice: p.unitPrice });
    });

    const methods: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'MOMO'];
    const restockPlan = [
      { sku: 'TV-TCL-50', qty: 3 },
      { sku: 'FR-NAS-01', qty: 2 },
      { sku: 'PB-ORA-20', qty: 12 },
      { sku: 'EL-EXT-5M', qty: 24 },
    ];

    for (let month = 0; month < 12; month += 1) {
      const monthName = getMonthName(seedStart, month);
      const tvQty = planQty(month < 4 ? 1 : 1.5, month, 0.15) + (month >= 8 ? 1 : 0);
      const accessoryQty = planQty(2, month, 0.25);
      const applianceQty = month < 5 ? 1 : 2;
      const officeQty = month < 7 ? 1 : 2;
      const scale = 1 + month / 10;

      const monthPlans: Array<{ day: number; sku: string; qty: number; paymentMethod: PaymentMethod }> = [
        { day: 4, sku: 'TV-TCL-50', qty: tvQty, paymentMethod: methods[month % methods.length] },
        {
          day: 11,
          sku: month % 2 === 0 ? 'BL-BAR-02' : 'PB-ORA-20',
          qty: planQty(accessoryQty * scale, month, 0),
          paymentMethod: methods[(month + 1) % methods.length],
        },
        {
          day: 19,
          sku: ['MW-SAM-01', 'FR-NAS-01', 'AC-MID-SP', 'SB-SAM-01'][month % 4],
          qty: planQty(applianceQty, month, month >= 6 ? 0.15 : 0),
          paymentMethod: methods[(month + 2) % methods.length],
        },
        {
          day: 26,
          sku: month % 3 === 0 ? 'TN-HP-12A' : 'CM-GEN-01',
          qty: planQty(officeQty, month, month >= 8 ? 0.2 : 0.05),
          paymentMethod: methods[(month + 3) % methods.length],
        },
      ];

      const sales: Array<{
        items: { productId: Types.ObjectId; productName: string; quantity: number; unitPrice: number }[];
        totalAmount: number;
        paymentMethod: PaymentMethod;
        staffId: Types.ObjectId;
        businessId: Types.ObjectId;
        createdAt: Date;
        updatedAt: Date;
      }> = [];
      const payments: Array<{
        amount: number;
        method: PaymentMethod;
        reference: string;
        businessId: Types.ObjectId;
        createdAt: Date;
        updatedAt: Date;
      }> = [];
      const inventoryLogs: Array<{
        productId: Types.ObjectId;
        quantity: number;
        type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT';
        note?: string;
        businessId: Types.ObjectId;
        createdAt: Date;
        updatedAt: Date;
      }> = [];
      const expenseDocs: Array<{
        category: string;
        amount: number;
        description?: string;
        businessId: Types.ObjectId;
        createdAt: Date;
        updatedAt: Date;
      }> = [];

      for (const [index, plan] of monthPlans.entries()) {
        const product = bySku.get(plan.sku);
        if (!product) continue;
        const createdAt = monthDate(seedStart, month, plan.day, 10 + index);
        const qty = Math.max(1, plan.qty);
        const totalAmount = product.unitPrice * qty;

        stockBySku.set(plan.sku, (stockBySku.get(plan.sku) || 0) - qty);

        sales.push({
          items: [{ productId: product._id, productName: product.name, quantity: qty, unitPrice: product.unitPrice }],
          totalAmount,
          paymentMethod: plan.paymentMethod,
          staffId: userId,
          businessId,
          createdAt,
          updatedAt: createdAt,
        });
        payments.push({
          amount: totalAmount,
          method: plan.paymentMethod,
          reference: `DEMO-${month + 1}-${index + 1}`,
          businessId,
          createdAt,
          updatedAt: createdAt,
        });
        inventoryLogs.push({
          productId: product._id,
          quantity: -qty,
          type: 'SALE',
          note: 'Demo sale',
          businessId,
          createdAt,
          updatedAt: createdAt,
        });
      }

      monthlyExpenses.forEach((row, idx) => {
        expenseDocs.push({
          category: row.category,
          amount: row.base + month * row.delta + (idx === 2 && month >= 8 ? 180 : 0),
          description: row.note,
          businessId,
          createdAt: monthDate(seedStart, month, 2 + idx * 4, 9),
          updatedAt: monthDate(seedStart, month, 2 + idx * 4, 9),
        });
      });
      if (month === 6) {
        expenseDocs.push({
          category: 'Repairs',
          amount: 930,
          description: 'Generator service and floor light repairs',
          businessId,
          createdAt: monthDate(seedStart, month, 16, 13),
          updatedAt: monthDate(seedStart, month, 16, 13),
        });
      }

      setSeedStatus(businessId, {
        running: true,
        progress: 18 + Math.round((month / 12) * 62),
        phase: `sales-${month + 1}`,
        message: `${monthName} sales loaded.`,
      });
      await Sale.insertMany(sales);
      await Payment.insertMany(payments);
      await InventoryRecord.insertMany(inventoryLogs);
      salesCount += sales.length;
      paymentCount += payments.length;
      inventoryCount += inventoryLogs.length;

      setSeedStatus(businessId, {
        running: true,
        progress: 24 + Math.round((month / 12) * 62),
        phase: `expenses-${month + 1}`,
        message: `${monthName} expenses loaded.`,
      });
      await Expense.insertMany(expenseDocs);
      expenseCount += expenseDocs.length;

      if (month % 3 === 2) {
        const restockDate = monthDate(seedStart, month, 8, 8);
        const restockLogs: Array<{
          productId: Types.ObjectId;
          quantity: number;
          type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT';
          note?: string;
          businessId: Types.ObjectId;
          createdAt: Date;
          updatedAt: Date;
        }> = [];
        for (const item of restockPlan) {
          const product = bySku.get(item.sku);
          if (!product) continue;
          stockBySku.set(item.sku, (stockBySku.get(item.sku) || 0) + item.qty);
          restockLogs.push({
            productId: product._id,
            quantity: item.qty,
            type: 'RESTOCK',
            note: `Quarterly restock for ${monthName}`,
            businessId,
            createdAt: restockDate,
            updatedAt: restockDate,
          });
        }
        if (restockLogs.length > 0) {
          await InventoryRecord.insertMany(restockLogs);
          inventoryCount += restockLogs.length;
          setSeedStatus(businessId, {
            running: true,
            progress: 30 + Math.round((month / 12) * 62),
            phase: `restock-${month + 1}`,
            message: `${monthName} restock movements saved.`,
          });
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 75));
    }

    await Product.bulkWrite(
      created.map((product) => ({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { currentStock: stockBySku.get(product.sku) || 0 } },
        },
      }))
    );

    setSeedStatus(businessId, {
      running: false,
      progress: 100,
      phase: 'done',
      message: 'Sample shop is ready.',
    });

    res.json({
      ok: true,
      products: created.length,
      sales: salesCount,
      expenses: expenseCount,
      payments: paymentCount,
      inventoryLogs: inventoryCount,
    });
  } catch (err) {
    if (req.auth?.businessId) {
      setSeedStatus(req.auth.businessId, {
        running: false,
        phase: 'error',
        message: err instanceof Error ? err.message : 'Demo setup failed',
      });
    }
    next(err);
  }
}
