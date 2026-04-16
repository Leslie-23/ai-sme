import { Schema, model, Document, Types } from 'mongoose';

export interface IAIQueryLog extends Document {
  _id: Types.ObjectId;
  userQuery: string;
  contextSnapshot: Record<string, unknown>;
  aiResponse: string;
  modelUsed: string;
  businessId: Types.ObjectId;
  userId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AIQueryLogSchema = new Schema<IAIQueryLog>(
  {
    userQuery: { type: String, required: true },
    contextSnapshot: { type: Schema.Types.Mixed, default: {} },
    aiResponse: { type: String, required: true },
    modelUsed: { type: String, required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

AIQueryLogSchema.index({ businessId: 1, createdAt: -1 });

export const AIQueryLog = model<IAIQueryLog>('AIQueryLog', AIQueryLogSchema);
