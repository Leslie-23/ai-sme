import { Types } from 'mongoose';

export interface AuthContext {
  userId: Types.ObjectId;
  businessId: Types.ObjectId;
  role: 'OWNER' | 'STAFF';
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
