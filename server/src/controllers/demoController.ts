import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Business } from '../models/Business';
import { Product } from '../models/Product';
import { Sale, PaymentMethod } from '../models/Sale';
import { Expense } from '../models/Expense';
import { Payment } from '../models/Payment';
import { InventoryRecord } from '../models/InventoryRecord';

const products = [
  ['TCL Smart TV 50', 'TV-TCL-50', 'Electronics', 4500, 3550, 9, 3],
  ['Samsung Microwave', 'MW-SAM-01', 'Appliances', 1850, 1400, 1, 4],
  ['Nasco Fridge/Freezer', 'FR-NAS-01', 'Appliances', 2795, 2180, 4, 2],
  ['Midea A/C Split', 'AC-MID-SP', 'Cooling', 2400, 1850, 1, 3],
  ['Bardefu Blender', 'BL-BAR-02', 'Kitchen', 550, 330, 18, 6],
  ['Oraimo Power Bank 20000', 'PB-ORA-20', 'Accessories', 220, 135, 6, 8],
  ['HP LaserJet Toner', 'TN-HP-12A', 'Office', 380, 260, 3, 5],
  ['Counting Machine', 'CM-GEN-01', 'Office', 890, 640, 1, 2],
  ['Samsung Sound Bar', 'SB-SAM-01', 'Audio', 1250, 920, 5, 2],
  ['Extension Cable 5m', 'EL-EXT-5M', 'Accessories', 95, 45, 42, 12],
] as const;

const expenseRows = [
  ['Rent', 2200, 'Monthly shop rent'],
  ['Utilities', 420, 'Electricity and water'],
  ['Staff', 1600, 'Part-time sales support'],
  ['Transport', 310, 'Supplier delivery runs'],
  ['Marketing', 260, 'Weekend promo flyers'],
  ['Fees', 180, 'Payment and bank charges'],
] as const;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10 + (days % 8), 15, 0, 0);
  return d;
}

export async function seedDemoBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.auth!.businessId;
    const userId = req.auth!.userId;

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

    const created = await Product.insertMany(
      products.map(([name, sku, category, unitPrice, costPrice, currentStock, lowStockThreshold]) => ({
        _id: new Types.ObjectId(),
        name,
        sku,
        category,
        unitPrice,
        costPrice,
        currentStock,
        lowStockThreshold,
        businessId,
      }))
    );
    const bySku = new Map(created.map((p) => [p.sku, p]));
    const methods: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'MOMO'];
    const saleTemplates = [
      ['TV-TCL-50', 1],
      ['BL-BAR-02', 2],
      ['FR-NAS-01', 1],
      ['AC-MID-SP', 1],
      ['PB-ORA-20', 3],
      ['TV-TCL-50', 1],
      ['MW-SAM-01', 1],
      ['SB-SAM-01', 1],
      ['EL-EXT-5M', 4],
      ['TV-TCL-50', 1],
      ['TN-HP-12A', 2],
      ['CM-GEN-01', 1],
    ] as const;

    const sales = saleTemplates.map(([sku, qty], i) => {
      const p = bySku.get(sku)!;
      return {
        items: [{ productId: p._id, productName: p.name, quantity: qty, unitPrice: p.unitPrice }],
        totalAmount: p.unitPrice * qty,
        paymentMethod: methods[i % methods.length],
        staffId: userId,
        businessId,
        createdAt: daysAgo(2 + i * 3),
        updatedAt: daysAgo(2 + i * 3),
      };
    });
    await Sale.insertMany(sales);
    await Payment.insertMany(
      sales.map((s, i) => ({
        amount: s.totalAmount,
        method: s.paymentMethod,
        reference: `DEMO-${i + 1}`,
        businessId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
    );
    await Expense.insertMany(
      expenseRows.map(([category, amount, description], i) => ({
        category,
        amount,
        description,
        businessId,
        createdAt: daysAgo(5 + i * 4),
        updatedAt: daysAgo(5 + i * 4),
      }))
    );
    await InventoryRecord.insertMany(
      sales.flatMap((s) =>
        s.items.map((it) => ({
          productId: it.productId,
          quantity: -it.quantity,
          type: 'SALE',
          note: 'Demo sale',
          businessId,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }))
      )
    );

    res.json({
      ok: true,
      products: created.length,
      sales: sales.length,
      expenses: expenseRows.length,
    });
  } catch (err) {
    next(err);
  }
}
