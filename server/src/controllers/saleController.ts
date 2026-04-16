import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Sale } from '../models/Sale';
import { Product } from '../models/Product';
import { InventoryRecord } from '../models/InventoryRecord';
import { HttpError } from '../middleware/error';

const createSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  paymentMethod: z.enum(['CASH', 'MOMO', 'CARD', 'TRANSFER']),
});

export async function createSale(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createSaleSchema.parse(req.body);
    const businessId = req.auth!.businessId;

    const productIds = input.items.map((i) => new Types.ObjectId(i.productId));
    const products = await Product.find({ _id: { $in: productIds }, businessId });
    if (products.length !== input.items.length) {
      throw new HttpError(400, 'One or more products not found for this business');
    }
    const byId = new Map(products.map((p) => [p._id.toString(), p]));

    const saleItems = input.items.map((i) => {
      const p = byId.get(i.productId)!;
      if (p.currentStock < i.quantity) {
        throw new HttpError(400, `Insufficient stock for ${p.name}`);
      }
      return {
        productId: p._id,
        productName: p.name,
        quantity: i.quantity,
        unitPrice: p.unitPrice,
      };
    });

    const totalAmount = saleItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);

    const sale = await Sale.create({
      items: saleItems,
      totalAmount,
      paymentMethod: input.paymentMethod,
      staffId: req.auth!.userId,
      businessId,
    });

    await Promise.all(
      saleItems.map(async (it) => {
        await Product.findOneAndUpdate(
          { _id: it.productId, businessId },
          { $inc: { currentStock: -it.quantity } }
        );
        await InventoryRecord.create({
          productId: it.productId,
          quantity: -it.quantity,
          type: 'SALE',
          note: `Sale ${sale._id}`,
          businessId,
        });
      })
    );

    res.status(201).json(sale);
  } catch (err) {
    next(err);
  }
}

const listFiltersSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  staffId: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'MOMO', 'CARD', 'TRANSFER']).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export async function listSales(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = listFiltersSchema.parse(req.query);
    const filter: Record<string, unknown> = { businessId: req.auth!.businessId };
    if (q.from || q.to) {
      const createdAt: Record<string, Date> = {};
      if (q.from) createdAt.$gte = new Date(q.from);
      if (q.to) createdAt.$lte = new Date(q.to);
      filter.createdAt = createdAt;
    }
    if (q.staffId) filter.staffId = new Types.ObjectId(q.staffId);
    if (q.paymentMethod) filter.paymentMethod = q.paymentMethod;

    const sales = await Sale.find(filter).sort({ createdAt: -1 }).limit(q.limit || 100);
    res.json(sales);
  } catch (err) {
    next(err);
  }
}
