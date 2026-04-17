import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import {
  extractTurn,
  importProductSchema,
  importSaleSchema,
  importPaymentSchema,
  importExpenseSchema,
  ImportProduct,
  ImportSale,
  ImportPayment,
  ImportExpense,
} from '../services/importExtractor';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { Payment } from '../models/Payment';
import { Expense } from '../models/Expense';
import { HttpError } from '../middleware/error';

const kindEnum = z.enum(['products', 'sales', 'payments', 'expenses', 'auto']);

const countsSchema = z
  .object({
    products: z.number().int().nonnegative().default(0),
    sales: z.number().int().nonnegative().default(0),
    payments: z.number().int().nonnegative().default(0),
    expenses: z.number().int().nonnegative().default(0),
  })
  .default({ products: 0, sales: 0, payments: 0, expenses: 0 });

const extractBodySchema = z.object({
  kind: kindEnum,
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().min(1).max(200000),
      })
    )
    .min(1)
    .max(60),
  alreadyExtracted: z.union([z.number().int().nonnegative(), countsSchema]).default(0),
});

export async function extractImport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = extractBodySchema.parse(req.body);
    const businessId = req.auth!.businessId;
    const result = await extractTurn({
      kind: input.kind,
      businessId,
      messages: input.messages,
      alreadyExtracted: input.alreadyExtracted,
    });
    res.json({
      reply: result.reply,
      records: result.records,
      done: result.done,
      modelUsed: result.modelUsed,
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('No API key')) {
      next(new HttpError(400, err.message));
      return;
    }
    next(err);
  }
}

const applyBodySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('products'),
    records: z.array(importProductSchema).min(1).max(500),
  }),
  z.object({
    kind: z.literal('sales'),
    records: z.array(importSaleSchema).min(1).max(500),
  }),
  z.object({
    kind: z.literal('payments'),
    records: z.array(importPaymentSchema).min(1).max(500),
  }),
  z.object({
    kind: z.literal('expenses'),
    records: z.array(importExpenseSchema).min(1).max(500),
  }),
  z.object({
    kind: z.literal('auto'),
    records: z.object({
      products: z.array(importProductSchema).max(500).default([]),
      sales: z.array(importSaleSchema).max(500).default([]),
      payments: z.array(importPaymentSchema).max(500).default([]),
      expenses: z.array(importExpenseSchema).max(500).default([]),
    }),
  }),
]);

async function applyProducts(businessId: Types.ObjectId, records: ImportProduct[]) {
  if (records.length === 0) return { inserted: 0, updated: 0, matched: 0 };
  const ops = records.map((r) => ({
    updateOne: {
      filter: { businessId, sku: r.sku },
      update: {
        $set: {
          name: r.name,
          category: r.category,
          unitPrice: r.unitPrice,
          costPrice: r.costPrice,
          currentStock: r.currentStock,
          lowStockThreshold: r.lowStockThreshold,
          businessId,
        },
      },
      upsert: true,
    },
  }));
  const result = await Product.bulkWrite(ops);
  return {
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    matched: result.matchedCount,
  };
}

async function applySales(
  businessId: Types.ObjectId,
  userId: Types.ObjectId,
  records: ImportSale[]
) {
  if (records.length === 0) return { inserted: 0 };
  const skus = Array.from(new Set(records.flatMap((s) => s.items.map((i) => i.sku))));
  const products = await Product.find({ businessId, sku: { $in: skus } })
    .select('_id name sku unitPrice')
    .lean();
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const missing = skus.filter((s) => !bySku.has(s));
  if (missing.length > 0) {
    throw new HttpError(400, `Unknown SKU(s): ${missing.join(', ')}`);
  }
  const docs = records.map((s) => {
    const items = s.items.map((it) => {
      const p = bySku.get(it.sku)!;
      return {
        productId: p._id,
        productName: p.name,
        quantity: it.quantity,
        unitPrice: p.unitPrice,
      };
    });
    const total = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const when = s.createdAt ? new Date(s.createdAt) : new Date();
    return {
      items,
      totalAmount: total,
      paymentMethod: s.paymentMethod,
      staffId: userId,
      businessId,
      createdAt: when,
      updatedAt: when,
    };
  });
  const result = await Sale.insertMany(docs, { ordered: false });
  return { inserted: result.length };
}

async function applyPayments(businessId: Types.ObjectId, records: ImportPayment[]) {
  if (records.length === 0) return { inserted: 0 };
  const docs = records.map((p) => ({
    amount: p.amount,
    method: p.method,
    reference: p.reference,
    businessId,
    ...(p.createdAt ? { createdAt: new Date(p.createdAt), updatedAt: new Date(p.createdAt) } : {}),
  }));
  const result = await Payment.insertMany(docs, { ordered: false });
  return { inserted: result.length };
}

async function applyExpenses(businessId: Types.ObjectId, records: ImportExpense[]) {
  if (records.length === 0) return { inserted: 0 };
  const docs = records.map((e) => ({
    amount: e.amount,
    category: e.category,
    description: e.description,
    businessId,
    ...(e.createdAt ? { createdAt: new Date(e.createdAt), updatedAt: new Date(e.createdAt) } : {}),
  }));
  const result = await Expense.insertMany(docs, { ordered: false });
  return { inserted: result.length };
}

export async function applyImport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = applyBodySchema.parse(req.body);
    const businessId = req.auth!.businessId;
    const userId = req.auth!.userId;

    if (input.kind === 'products') {
      res.status(200).json(await applyProducts(businessId, input.records));
      return;
    }
    if (input.kind === 'sales') {
      res.status(200).json(await applySales(businessId, userId, input.records));
      return;
    }
    if (input.kind === 'payments') {
      res.status(200).json(await applyPayments(businessId, input.records));
      return;
    }
    if (input.kind === 'expenses') {
      res.status(200).json(await applyExpenses(businessId, input.records));
      return;
    }
    if (input.kind === 'auto') {
      // Products first so sales can reference freshly-upserted SKUs
      const products = await applyProducts(businessId, input.records.products);
      const sales = await applySales(businessId, userId, input.records.sales);
      const payments = await applyPayments(businessId, input.records.payments);
      const expenses = await applyExpenses(businessId, input.records.expenses);
      res.status(200).json({ products, sales, payments, expenses });
      return;
    }

    throw new HttpError(400, 'Unsupported import kind');
  } catch (err) {
    next(err);
  }
}
