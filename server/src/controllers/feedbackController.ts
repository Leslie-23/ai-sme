import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Feedback } from '../models/Feedback';

const feedbackSchema = z.object({
  surface: z.string().min(1).max(200),
  rating: z.enum(['useful', 'not_useful']),
  note: z.string().max(2000).optional().default(''),
  metadata: z.record(z.unknown()).optional().default({}),
});

export async function createFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = feedbackSchema.parse(req.body);
    const feedback = await Feedback.create({
      businessId: req.auth!.businessId,
      userId: req.auth!.userId,
      surface: input.surface,
      rating: input.rating,
      note: input.note.trim(),
      metadata: input.metadata,
    });
    res.status(201).json({ ok: true, id: feedback._id.toString() });
  } catch (err) {
    next(err);
  }
}
