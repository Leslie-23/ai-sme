import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Business } from '../models/Business';
import { HttpError } from '../middleware/error';

export async function getBusiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.auth!.businessId;
    const b = await Business.findById(businessId);
    if (!b) throw new HttpError(404, 'Business not found');
    res.json({
      id: b._id.toString(),
      name: b.name,
      currency: b.currency,
      timezone: b.timezone,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  currency: z.string().min(3).max(5).optional(),
  timezone: z.string().min(1).max(100).optional(),
});

export async function updateBusiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = updateSchema.parse(req.body);
    const businessId = req.auth!.businessId;
    const patch: Record<string, string> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.currency !== undefined) patch.currency = input.currency.trim().toUpperCase();
    if (input.timezone !== undefined) patch.timezone = input.timezone.trim();
    const b = await Business.findByIdAndUpdate(businessId, { $set: patch }, { new: true });
    if (!b) throw new HttpError(404, 'Business not found');
    res.json({
      id: b._id.toString(),
      name: b.name,
      currency: b.currency,
      timezone: b.timezone,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
