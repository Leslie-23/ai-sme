import { Request, Response, NextFunction } from 'express';
import { Business, hasProAccess } from '../models/Business';
import { HttpError } from './error';

// Business-tier only: requires an active/trialing subscription AND plan === 'business'.
// Used for perks exclusive to the Business tier (e.g. full data export).
export async function requireBusiness(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.auth?.businessId;
    if (!businessId) throw new HttpError(401, 'Authentication required');

    const business = await Business.findById(businessId).select('subscription');
    if (!business) throw new HttpError(404, 'Business not found');

    const sub = business.subscription;
    if (!hasProAccess(sub) || sub?.plan !== 'business') {
      throw new HttpError(402, 'This feature requires the Business plan');
    }
    next();
  } catch (err) {
    next(err);
  }
}
