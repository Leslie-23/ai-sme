import { Schema, model, Document, Types } from 'mongoose';
import type { PaymentMethod } from './Sale';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  businessId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['CASH', 'MOMO', 'CARD', 'TRANSFER'], required: true },
    reference: { type: String, trim: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  },
  { timestamps: true }
);

PaymentSchema.index({ businessId: 1, createdAt: -1 });

export const Payment = model<IPayment>('Payment', PaymentSchema);
