import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  User,
  IUser,
  DEFAULT_NEW_STAFF_PERMISSIONS,
  effectivePermissions,
} from '../models/User';
import { HttpError } from '../middleware/error';

function serialize(u: IUser) {
  return {
    id: u._id.toString(),
    email: u.email,
    role: u.role,
    name: u.name || null,
    roleLabel: u.roleLabel || null,
    permissions: effectivePermissions({ role: u.role, permissions: u.permissions }),
    createdAt: u.createdAt.toISOString(),
  };
}

export async function listTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.auth!.businessId;
    const users = await User.find({ businessId }).sort({ role: 1, createdAt: 1 });
    res.json({ members: users.map(serialize) });
  } catch (err) {
    next(err);
  }
}

const permissionsSchema = z
  .object({
    recordSales: z.boolean().optional(),
    manageInventory: z.boolean().optional(),
    viewReports: z.boolean().optional(),
    managePayments: z.boolean().optional(),
    manageExpenses: z.boolean().optional(),
    useAI: z.boolean().optional(),
  })
  .strict();

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120).optional(),
  roleLabel: z.string().min(1).max(60).optional(),
  permissions: permissionsSchema.optional(),
});

export async function createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createSchema.parse(req.body);
    const businessId = req.auth!.businessId;

    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) throw new HttpError(409, 'A user with that email already exists');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.create({
      email: input.email.toLowerCase(),
      passwordHash,
      role: 'STAFF',
      businessId,
      name: input.name?.trim() || null,
      roleLabel: input.roleLabel?.trim() || null,
      permissions: { ...DEFAULT_NEW_STAFF_PERMISSIONS, ...(input.permissions || {}) },
    });

    res.status(201).json(serialize(user));
  } catch (err) {
    next(err);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(120).nullable().optional(),
  roleLabel: z.string().min(1).max(60).nullable().optional(),
  permissions: permissionsSchema.optional(),
  password: z.string().min(8).optional(),
});

export async function updateStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateSchema.parse(req.body);
    const businessId = req.auth!.businessId;
    const { id } = req.params;

    const user = await User.findOne({ _id: id, businessId });
    if (!user) throw new HttpError(404, 'Team member not found');
    if (user.role === 'OWNER') {
      throw new HttpError(400, 'The owner account cannot be modified here');
    }

    if (input.name !== undefined) user.name = input.name?.trim() || null;
    if (input.roleLabel !== undefined) user.roleLabel = input.roleLabel?.trim() || null;
    if (input.permissions) {
      // Merge onto whatever they already had so partial updates don't wipe the rest.
      const current = effectivePermissions({ role: 'STAFF', permissions: user.permissions });
      user.permissions = { ...current, ...input.permissions };
    }
    if (input.password) {
      user.passwordHash = await bcrypt.hash(input.password, 12);
    }

    await user.save();
    res.json(serialize(user));
  } catch (err) {
    next(err);
  }
}

export async function deleteStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.auth!.businessId;
    const { id } = req.params;
    const user = await User.findOne({ _id: id, businessId });
    if (!user) throw new HttpError(404, 'Team member not found');
    if (user.role === 'OWNER') {
      throw new HttpError(400, 'The owner account cannot be deleted here');
    }
    await user.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
