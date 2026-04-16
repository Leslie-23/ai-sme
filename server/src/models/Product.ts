import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  currentStock: number;
  lowStockThreshold: number;
  businessId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    category: { type: String, default: 'Uncategorized', trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0, default: 0 },
    currentStock: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  },
  { timestamps: true }
);

ProductSchema.index({ businessId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ businessId: 1, name: 1 });

export const Product = model<IProduct>('Product', ProductSchema);
