import { Schema, model, Document, Types } from 'mongoose';

export type Terminology = 'product' | 'item' | 'service';

export interface IBusinessFeatures {
  chat: boolean;
  imports: boolean;
  expenses: boolean;
  payments: boolean;
}

export interface IBusiness extends Document {
  _id: Types.ObjectId;
  name: string;
  owner: Types.ObjectId;
  currency: string;
  timezone: string;
  features: IBusinessFeatures;
  terminology: Terminology;
  categories: string[];
  createdAt: Date;
  updatedAt: Date;
}

const FeaturesSchema = new Schema<IBusinessFeatures>(
  {
    chat: { type: Boolean, default: true },
    imports: { type: Boolean, default: true },
    expenses: { type: Boolean, default: true },
    payments: { type: Boolean, default: true },
  },
  { _id: false }
);

const BusinessSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    currency: { type: String, default: 'USD', uppercase: true },
    timezone: { type: String, default: 'UTC' },
    features: {
      type: FeaturesSchema,
      default: () => ({ chat: true, imports: true, expenses: true, payments: true }),
    },
    terminology: {
      type: String,
      enum: ['product', 'item', 'service'],
      default: 'product',
    },
    categories: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Business = model<IBusiness>('Business', BusinessSchema);

export const DEFAULT_FEATURES: IBusinessFeatures = {
  chat: true,
  imports: true,
  expenses: true,
  payments: true,
};

export function normalizeFeatures(input: Partial<IBusinessFeatures> | undefined | null): IBusinessFeatures {
  return {
    chat: input?.chat ?? DEFAULT_FEATURES.chat,
    imports: input?.imports ?? DEFAULT_FEATURES.imports,
    expenses: input?.expenses ?? DEFAULT_FEATURES.expenses,
    payments: input?.payments ?? DEFAULT_FEATURES.payments,
  };
}
