import { Schema, model, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  _id: Types.ObjectId;
  amount: number;
  category: string;
  description?: string;
  businessId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ businessId: 1, createdAt: -1 });

export const Expense = model<IExpense>('Expense', ExpenseSchema);
