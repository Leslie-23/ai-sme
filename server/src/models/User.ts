import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'OWNER' | 'STAFF';

export type PermissionKey =
  | 'recordSales'
  | 'manageInventory'
  | 'viewReports'
  | 'managePayments'
  | 'manageExpenses'
  | 'useAI';

export interface IUserPermissions {
  recordSales: boolean;
  manageInventory: boolean;
  viewReports: boolean;
  managePayments: boolean;
  manageExpenses: boolean;
  useAI: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  businessId: Types.ObjectId;
  name?: string | null;
  roleLabel?: string | null;
  permissions?: IUserPermissions;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionsSchema = new Schema<IUserPermissions>(
  {
    recordSales: { type: Boolean, default: true },
    manageInventory: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: false },
    managePayments: { type: Boolean, default: false },
    manageExpenses: { type: Boolean, default: false },
    useAI: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['OWNER', 'STAFF'], required: true, default: 'STAFF' },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, default: null, trim: true },
    roleLabel: { type: String, default: null, trim: true },
    permissions: { type: PermissionsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);

// Owners always have every permission. Staff use their explicit flags; if the
// field is missing (old docs), they fall back to a legacy "all true" set so we
// don't suddenly lock existing staff out when this schema is deployed.
const LEGACY_STAFF_PERMISSIONS: IUserPermissions = {
  recordSales: true,
  manageInventory: true,
  viewReports: true,
  managePayments: true,
  manageExpenses: true,
  useAI: true,
};

export const DEFAULT_NEW_STAFF_PERMISSIONS: IUserPermissions = {
  recordSales: true,
  manageInventory: false,
  viewReports: false,
  managePayments: false,
  manageExpenses: false,
  useAI: false,
};

export function effectivePermissions(user: Pick<IUser, 'role' | 'permissions'>): IUserPermissions {
  if (user.role === 'OWNER') {
    return {
      recordSales: true,
      manageInventory: true,
      viewReports: true,
      managePayments: true,
      manageExpenses: true,
      useAI: true,
    };
  }
  const p = user.permissions;
  if (!p) return LEGACY_STAFF_PERMISSIONS;
  return {
    recordSales: p.recordSales ?? LEGACY_STAFF_PERMISSIONS.recordSales,
    manageInventory: p.manageInventory ?? LEGACY_STAFF_PERMISSIONS.manageInventory,
    viewReports: p.viewReports ?? LEGACY_STAFF_PERMISSIONS.viewReports,
    managePayments: p.managePayments ?? LEGACY_STAFF_PERMISSIONS.managePayments,
    manageExpenses: p.manageExpenses ?? LEGACY_STAFF_PERMISSIONS.manageExpenses,
    useAI: p.useAI ?? LEGACY_STAFF_PERMISSIONS.useAI,
  };
}
