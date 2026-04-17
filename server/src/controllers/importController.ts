import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { extractProductsTurn, importProductSchema } from '../services/importExtractor';
import { Product } from '../models/Product';
import { HttpError } from '../middleware/error';

const extractBodySchema = z.object({
  kind: z.literal('products'),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().min(1).max(20000),
      })
    )
    .min(1)
    .max(60),
  alreadyExtracted: z.number().int().nonnegative().default(0),
});

export async function extractImport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = extractBodySchema.parse(req.body);
    const businessId = req.auth!.businessId;
    const result = await extractProductsTurn({
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

const applyBodySchema = z.object({
  kind: z.literal('products'),
  records: z.array(importProductSchema).min(1).max(500),
});

export async function applyImport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = applyBodySchema.parse(req.body);
    const businessId = req.auth!.businessId;

    const ops = input.records.map((r) => ({
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
    res.status(200).json({
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      matched: result.matchedCount,
    });
  } catch (err) {
    next(err);
  }
}
