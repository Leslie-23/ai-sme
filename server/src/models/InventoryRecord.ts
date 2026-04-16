import { Schema, model, Document, Types } from 'mongoose';

export type InventoryRecordType = 'SALE' | 'RESTOCK' | 'ADJUSTMENT';

export interface IInventoryRecord extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  type: InventoryRecordType;
  note?: string;
  businessId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryRecordSchema = new Schema<IInventoryRecord>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity: { type: Number, required: true },
    type: { type: String, enum: ['SALE', 'RESTOCK', 'ADJUSTMENT'], required: true },
    note: { type: String },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  },
  { timestamps: true }
);

InventoryRecordSchema.index({ businessId: 1, createdAt: -1 });

export const InventoryRecord = model<IInventoryRecord>('InventoryRecord', InventoryRecordSchema);
