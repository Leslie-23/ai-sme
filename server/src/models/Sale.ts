import { Schema, model, Document, Types } from 'mongoose';

export type PaymentMethod = 'CASH' | 'MOMO' | 'CARD' | 'TRANSFER';

export interface ISaleItem {
  productId: Types.ObjectId;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface ISale extends Document {
  _id: Types.ObjectId;
  items: ISaleItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  staffId: Types.ObjectId;
  businessId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    items: { type: [SaleItemSchema], required: true, validate: (v: ISaleItem[]) => v.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['CASH', 'MOMO', 'CARD', 'TRANSFER'], required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  },
  { timestamps: true }
);

SaleSchema.index({ businessId: 1, createdAt: -1 });
SaleSchema.index({ businessId: 1, paymentMethod: 1 });

export const Sale = model<ISale>('Sale', SaleSchema);
