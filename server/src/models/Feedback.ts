import { Schema, model, Document, Types } from 'mongoose';

export interface IFeedback extends Document {
  businessId: Types.ObjectId;
  userId: Types.ObjectId;
  surface: string;
  rating: 'useful' | 'not_useful';
  note: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    surface: { type: String, required: true, trim: true, maxlength: 200 },
    rating: { type: String, enum: ['useful', 'not_useful'], required: true },
    note: { type: String, default: '', maxlength: 2000 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

FeedbackSchema.index({ businessId: 1, createdAt: -1 });

export const Feedback = model<IFeedback>('Feedback', FeedbackSchema);
