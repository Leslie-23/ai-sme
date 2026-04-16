import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Payment } from '../models/Payment';

const createSchema = z.object({
  amount: z.number().nonnegative(),
  method: z.enum(['CASH', 'MOMO', 'CARD', 'TRANSFER']),
  reference: z.string().optional(),
});

export async function listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payments = await Payment.find({ businessId: req.auth!.businessId })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(payments);
  } catch (err) {
    next(err);
  }
}

export async function createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createSchema.parse(req.body);
    const payment = await Payment.create({ ...input, businessId: req.auth!.businessId });
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
}
