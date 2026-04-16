import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'OWNER' | 'STAFF';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  businessId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['OWNER', 'STAFF'], required: true, default: 'STAFF' },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
