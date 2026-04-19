import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  Business,
  IBusiness,
  backfillSubscriptionIfMissing,
  hasProAccess,
  normalizeFeatures,
  normalizeSubscription,
} from '../models/Business';
import { HttpError } from '../middleware/error';

async function ensureBusiness(businessId: IBusiness['_id'], userId: IBusiness['_id']) {
  const existing = await Business.findById(businessId);
  if (existing) {
    if (backfillSubscriptionIfMissing(existing)) await existing.save();
    return existing;
  }
  // Self-heal: the JWT's businessId references a Business that no longer exists
  // (e.g. DB was purged while the user's token / User record survived). Create
  // a default Business with the same ID so the app stays usable.
  return Business.create({
    _id: businessId,
    name: 'My Business',
    owner: userId,
    currency: 'USD',
    timezone: 'UTC',
  });
}

function serialize(b: IBusiness) {
  const sub = normalizeSubscription(b.subscription);
  return {
    id: b._id.toString(),
    name: b.name,
    currency: b.currency,
    timezone: b.timezone,
    features: normalizeFeatures(b.features),
    terminology: b.terminology || 'product',
    categories: Array.isArray(b.categories) ? b.categories : [],
    subscription: {
      plan: sub.plan,
      status: sub.status,
      trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
      currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      hasProAccess: hasProAccess(sub),
    },
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export async function getBusiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.auth!.businessId;
    const userId = req.auth!.userId;
    const b = await ensureBusiness(businessId, userId);
    res.json(serialize(b));
  } catch (err) {
    next(err);
  }
}

const featuresSchema = z
  .object({
    chat: z.boolean().optional(),
    imports: z.boolean().optional(),
    expenses: z.boolean().optional(),
    payments: z.boolean().optional(),
  })
  .strict();

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  currency: z.string().min(3).max(5).optional(),
  timezone: z.string().min(1).max(100).optional(),
  features: featuresSchema.optional(),
  terminology: z.enum(['product', 'item', 'service']).optional(),
  categories: z.array(z.string().min(1).max(80)).max(200).optional(),
});

export async function updateBusiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = updateSchema.parse(req.body);
    const businessId = req.auth!.businessId;
    const userId = req.auth!.userId;
    await ensureBusiness(businessId, userId);
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.currency !== undefined) patch.currency = input.currency.trim().toUpperCase();
    if (input.timezone !== undefined) patch.timezone = input.timezone.trim();
    if (input.terminology !== undefined) patch.terminology = input.terminology;
    if (input.categories !== undefined) {
      const cleaned = Array.from(
        new Set(input.categories.map((c) => c.trim()).filter((c) => c.length > 0))
      );
      patch.categories = cleaned;
    }
    if (input.features !== undefined) {
      const existing = await Business.findById(businessId).select('features');
      const merged = normalizeFeatures({ ...existing?.features, ...input.features });
      patch.features = merged;
    }
    const b = await Business.findByIdAndUpdate(businessId, { $set: patch }, { new: true });
    if (!b) throw new HttpError(404, 'Business not found');
    res.json(serialize(b));
  } catch (err) {
    next(err);
  }
}
