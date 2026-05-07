import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SetupLead } from '../models/SetupLead';

const setupLeadSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().max(200),
  phone: z.string().max(80).optional().default(''),
  businessName: z.string().min(1).max(200),
  businessType: z.string().min(1).max(80),
  currentSystem: z.string().max(500).optional().default(''),
  goal: z.string().max(1000).optional().default(''),
});

export async function createSetupLead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = setupLeadSchema.parse(req.body);
    const lead = await SetupLead.create({
      ...input,
      name: input.name.trim(),
      businessName: input.businessName.trim(),
      phone: input.phone.trim(),
      currentSystem: input.currentSystem.trim(),
      goal: input.goal.trim(),
    });
    res.status(201).json({ ok: true, id: lead._id.toString() });
  } catch (err) {
    next(err);
  }
}
