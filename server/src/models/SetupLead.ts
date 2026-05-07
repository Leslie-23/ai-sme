import { Schema, model, Document } from 'mongoose';

export interface ISetupLead extends Document {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  currentSystem: string;
  goal: string;
  createdAt: Date;
  updatedAt: Date;
}

const SetupLeadSchema = new Schema<ISetupLead>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, default: '', trim: true, maxlength: 80 },
    businessName: { type: String, required: true, trim: true, maxlength: 200 },
    businessType: { type: String, required: true, trim: true, maxlength: 80 },
    currentSystem: { type: String, default: '', trim: true, maxlength: 500 },
    goal: { type: String, default: '', trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

SetupLeadSchema.index({ createdAt: -1 });

export const SetupLead = model<ISetupLead>('SetupLead', SetupLeadSchema);
