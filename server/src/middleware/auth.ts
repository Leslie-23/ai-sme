import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../utils/env';

interface JwtPayload {
  userId: string;
  businessId: string;
  role: 'OWNER' | 'STAFF';
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }
  const token = header.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.auth = {
      userId: new Types.ObjectId(decoded.userId),
      businessId: new Types.ObjectId(decoded.businessId),
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  if (req.auth?.role !== 'OWNER') {
    res.status(403).json({ error: 'Owner role required' });
    return;
  }
  next();
}
