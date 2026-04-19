import { Types } from 'mongoose';
import { Business, hasProAccess } from '../models/Business';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { HttpError } from '../middleware/error';

export const FREE_PRODUCT_LIMIT = 50;
export const FREE_SALES_PER_MONTH = 200;

export async function assertCanAddProduct(businessId: Types.ObjectId): Promise<void> {
  const business = await Business.findById(businessId).select('subscription');
  if (!business) return; // controllers already handle missing business
  if (hasProAccess(business.subscription)) return;

  const count = await Product.countDocuments({ businessId });
  if (count >= FREE_PRODUCT_LIMIT) {
    throw new HttpError(
      402,
      `Free plan is limited to ${FREE_PRODUCT_LIMIT} products. Upgrade to Pro for unlimited.`
    );
  }
}

export async function assertCanAddSale(businessId: Types.ObjectId): Promise<void> {
  const business = await Business.findById(businessId).select('subscription');
  if (!business) return;
  if (hasProAccess(business.subscription)) return;

  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const count = await Sale.countDocuments({ businessId, createdAt: { $gte: start } });
  if (count >= FREE_SALES_PER_MONTH) {
    throw new HttpError(
      402,
      `Free plan is limited to ${FREE_SALES_PER_MONTH} sales per month. Upgrade to Pro for unlimited.`
    );
  }
}
