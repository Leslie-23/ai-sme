import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { z } from 'zod';
import { User } from '../models/User';
import {
  Business,
  IBusiness,
  backfillSubscriptionIfMissing,
  hasProAccess,
  normalizeFeatures,
  normalizeSubscription,
} from '../models/Business';
import { signToken } from '../middleware/auth';
import { HttpError } from '../middleware/error';

function serializeBusiness(b: IBusiness) {
  const sub = normalizeSubscription(b.subscription);
  return {
    id: b._id.toString(),
    name: b.name,
    currency: b.currency,
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
  };
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(1),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: input.email });
    if (existing) throw new HttpError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const businessId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    const user = await User.create({
      _id: userId,
      email: input.email,
      passwordHash,
      role: 'OWNER',
      businessId,
    });

    const business = await Business.create({
      _id: businessId,
      name: input.businessName,
      owner: userId,
      currency: input.currency || 'USD',
      timezone: input.timezone || 'UTC',
    });

    const token = signToken({
      userId: user._id.toString(),
      businessId: business._id.toString(),
      role: user.role,
      email: user.email,
    });

    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, role: user.role },
      business: serializeBusiness(business),
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase() });
    if (!user) throw new HttpError(401, 'Invalid credentials');
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');

    let business = await Business.findById(user.businessId);
    if (!business) {
      // Self-heal: User doc survived a DB wipe / mismatched seed. Recreate the
      // Business with the user's existing businessId so the app stays usable.
      business = await Business.create({
        _id: user.businessId,
        name: 'My Business',
        owner: user._id,
        currency: 'USD',
        timezone: 'UTC',
      });
    } else if (backfillSubscriptionIfMissing(business)) {
      // Business existed before the subscription schema — grant them a trial.
      await business.save();
    }

    const token = signToken({
      userId: user._id.toString(),
      businessId: user.businessId.toString(),
      role: user.role,
      email: user.email,
    });

    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role },
      business: serializeBusiness(business),
    });
  } catch (err) {
    next(err);
  }
}
