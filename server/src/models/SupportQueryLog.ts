import { Schema, model, Document, Types } from 'mongoose';

export interface ISupportQueryLog extends Document {
  _id: Types.ObjectId;
  userQuery: string;
  retrievedDocIds: string[];
  aiResponse: string;
  modelUsed: string;
  businessId: Types.ObjectId;
  userId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SupportQueryLogSchema = new Schema<ISupportQueryLog>(
  {
    userQuery: { type: String, required: true },
    retrievedDocIds: [{ type: String }],
    aiResponse: { type: String, required: true },
    modelUsed: { type: String, required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

SupportQueryLogSchema.index({ businessId: 1, createdAt: -1 });

export const SupportQueryLog = model<ISupportQueryLog>('SupportQueryLog', SupportQueryLogSchema);
