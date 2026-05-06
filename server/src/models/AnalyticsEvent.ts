import { Schema, model, Document, Types } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  businessId: Types.ObjectId | null;
  userId: Types.ObjectId | null;
  name: string;
  properties: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120, index: true },
    properties: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AnalyticsEventSchema.index({ createdAt: -1 });
AnalyticsEventSchema.index({ businessId: 1, name: 1, createdAt: -1 });

export const AnalyticsEvent = model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
