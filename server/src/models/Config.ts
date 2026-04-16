import { Schema, model, Document, Types } from 'mongoose';

export interface IConfig extends Document {
  _id: Types.ObjectId;
  key: string;
  value: string;
  businessId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConfigSchema = new Schema<IConfig>(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  },
  { timestamps: true }
);

ConfigSchema.index({ businessId: 1, key: 1 }, { unique: true });

export const Config = model<IConfig>('Config', ConfigSchema);
