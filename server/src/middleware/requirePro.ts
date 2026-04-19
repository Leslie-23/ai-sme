import { Request, Response, NextFunction } from 'express';
import { Business, hasProAccess } from '../models/Business';
import { HttpError } from './error';

export async function requirePro(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.auth?.businessId;
    if (!businessId) throw new HttpError(401, 'Authentication required');

    const business = await Business.findById(businessId).select('subscription');
    if (!business) throw new HttpError(404, 'Business not found');

    if (!hasProAccess(business.subscription)) {
      throw new HttpError(402, 'This feature requires a Pro subscription');
    }
    next();
  } catch (err) {
    next(err);
  }
}
