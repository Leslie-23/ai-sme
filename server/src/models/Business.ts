import { Schema, model, Document, Types } from 'mongoose';

export interface IBusiness extends Document {
  _id: Types.ObjectId;
  name: string;
  owner: Types.ObjectId;
  currency: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    currency: { type: String, default: 'USD', uppercase: true },
    timezone: { type: String, default: 'UTC' },
  },
  { timestamps: true }
);

export const Business = model<IBusiness>('Business', BusinessSchema);
