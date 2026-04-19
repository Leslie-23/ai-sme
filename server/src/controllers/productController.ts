import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Product } from '../models/Product';
import { HttpError } from '../middleware/error';
import { assertCanAddProduct } from '../services/planLimits';

const createSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional(),
  currentStock: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
});

const updateSchema = createSchema.partial();

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await Product.find({ businessId: req.auth!.businessId }).sort({ name: 1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createSchema.parse(req.body);
    await assertCanAddProduct(req.auth!.businessId);
    const product = await Product.create({ ...input, businessId: req.auth!.businessId });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateSchema.parse(req.body);
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, businessId: req.auth!.businessId },
      input,
      { new: true }
    );
    if (!product) throw new HttpError(404, 'Product not found');
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await Product.findOneAndDelete({
      _id: req.params.id,
      businessId: req.auth!.businessId,
    });
    if (!result) throw new HttpError(404, 'Product not found');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
