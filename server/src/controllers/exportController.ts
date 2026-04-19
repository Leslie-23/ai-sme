import { Request, Response, NextFunction } from 'express';
import { Business } from '../models/Business';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { Payment } from '../models/Payment';
import { Expense } from '../models/Expense';
import { HttpError } from '../middleware/error';

// Full JSON dump of everything the business owns. Gated by requirePro on the
// route so Free accounts get a 402.
export async function exportAllJson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.auth!.businessId;
    const [business, products, sales, payments, expenses] = await Promise.all([
      Business.findById(businessId).lean(),
      Product.find({ businessId }).lean(),
      Sale.find({ businessId }).lean(),
      Payment.find({ businessId }).lean(),
      Expense.find({ businessId }).lean(),
    ]);
    if (!business) throw new HttpError(404, 'Business not found');

    const filename = `export-${business._id.toString()}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Strip sensitive Mongoose internals Mongoose gave us (they're there in .lean() output anyway — just not secrets).
    res.json({
      exportedAt: new Date().toISOString(),
      business: {
        id: business._id.toString(),
        name: business.name,
        currency: business.currency,
        timezone: business.timezone,
        categories: business.categories,
        terminology: business.terminology,
      },
      counts: {
        products: products.length,
        sales: sales.length,
        payments: payments.length,
        expenses: expenses.length,
      },
      products,
      sales,
      payments,
      expenses,
    });
  } catch (err) {
    next(err);
  }
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

export async function exportProductsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await Product.find({ businessId: req.auth!.businessId }).lean();
    const csv = toCsv(
      rows.map((r) => ({
        sku: r.sku,
        name: r.name,
        category: r.category || '',
        unitPrice: r.unitPrice,
        costPrice: r.costPrice ?? '',
        currentStock: r.currentStock,
        lowStockThreshold: r.lowStockThreshold,
      })),
      ['sku', 'name', 'category', 'unitPrice', 'costPrice', 'currentStock', 'lowStockThreshold']
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="products.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

export async function exportSalesCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await Sale.find({ businessId: req.auth!.businessId }).lean();
    // Flatten: one row per line item, with the parent sale's timestamp/method.
    const flattened = rows.flatMap((s: any) =>
      (s.items || []).map((it: any) => ({
        saleId: s._id.toString(),
        createdAt: s.createdAt?.toISOString?.() || s.createdAt,
        paymentMethod: s.paymentMethod,
        totalAmount: s.totalAmount,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      }))
    );
    const csv = toCsv(flattened, [
      'saleId',
      'createdAt',
      'paymentMethod',
      'totalAmount',
      'productName',
      'quantity',
      'unitPrice',
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sales.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
