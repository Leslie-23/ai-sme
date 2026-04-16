import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Expense } from '../models/Expense';

const createSchema = z.object({
  amount: z.number().nonnegative(),
  category: z.string().min(1),
  description: z.string().optional(),
});

export async function listExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const expenses = await Expense.find({ businessId: req.auth!.businessId })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(expenses);
  } catch (err) {
    next(err);
  }
}

export async function createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createSchema.parse(req.body);
    const expense = await Expense.create({ ...input, businessId: req.auth!.businessId });
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}
