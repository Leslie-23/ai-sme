import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Product } from '../models/Product';
import { InventoryRecord } from '../models/InventoryRecord';
import { HttpError } from '../middleware/error';

export async function listInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await Product.find({ businessId: req.auth!.businessId })
      .select('_id name sku category unitPrice costPrice currentStock lowStockThreshold')
      .sort({ name: 1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

const adjustSchema = z.object({
  productId: z.string().min(1),
  quantityDelta: z.number().int(),
  type: z.enum(['RESTOCK', 'ADJUSTMENT']),
  note: z.string().optional(),
});

export async function adjustInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = adjustSchema.parse(req.body);
    const businessId = req.auth!.businessId;
    const product = await Product.findOneAndUpdate(
      { _id: new Types.ObjectId(input.productId), businessId },
      { $inc: { currentStock: input.quantityDelta } },
      { new: true }
    );
    if (!product) throw new HttpError(404, 'Product not found');

    await InventoryRecord.create({
      productId: product._id,
      quantity: input.quantityDelta,
      type: input.type,
      note: input.note,
      businessId,
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}
