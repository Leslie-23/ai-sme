import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { z } from 'zod';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { signToken } from '../middleware/auth';
import { HttpError } from '../middleware/error';

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
      business: { id: business._id, name: business.name, currency: business.currency },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const user = await User.findOne({ email: input.email });
    if (!user) throw new HttpError(401, 'Invalid credentials');
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');

    const business = await Business.findById(user.businessId);
    if (!business) throw new HttpError(500, 'Associated business missing');

    const token = signToken({
      userId: user._id.toString(),
      businessId: user.businessId.toString(),
      role: user.role,
      email: user.email,
    });

    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role },
      business: { id: business._id, name: business.name, currency: business.currency },
    });
  } catch (err) {
    next(err);
  }
}
