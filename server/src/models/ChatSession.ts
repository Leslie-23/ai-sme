import { Schema, model, Document, Types } from 'mongoose';

export interface IChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modelUsed?: string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  userId?: Types.ObjectId;
  sessionId: string;
  title: string;
  messages: IChatMessage[];
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    id: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
    modelUsed: { type: String },
    timestamp: { type: Date, required: true },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: String, required: true },
    title: { type: String, required: true },
    messages: { type: [ChatMessageSchema], default: [] },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChatSessionSchema.index({ businessId: 1, sessionId: 1 }, { unique: true });
ChatSessionSchema.index({ businessId: 1, updatedAt: -1 });

export const ChatSession = model<IChatSession>('ChatSession', ChatSessionSchema);
