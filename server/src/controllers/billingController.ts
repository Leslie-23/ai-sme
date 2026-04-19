import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Business } from '../models/Business';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';
import {
  PaidPlanId,
  disableSubscription,
  getBillingCurrency,
  getPlanConfig,
  getPublicKey,
  initializeTransaction,
  isPaystackConfigured,
  verifyTransaction,
} from '../services/paystack';

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function formatPrice(subunit: number, currency: string): string {
  if (currency === 'USD') return `${formatUsd(subunit)}/mo`;
  const whole = subunit / 100;
  return `${currency} ${whole.toLocaleString()}/mo`;
}

export async function getPlans(_req: Request, res: Response): Promise<void> {
  const currency = getBillingCurrency();
  const pro = getPlanConfig('pro');
  const business = getPlanConfig('business');

  res.json({
    configured: isPaystackConfigured(),
    currency,
    publicKey: isPaystackConfigured() ? getPublicKey() : null,
    plans: [
      {
        id: 'free',
        name: 'Free',
        priceLabel: currency === 'USD' ? '$0' : `${currency} 0`,
        priceSubunit: 0,
        interval: null,
        highlight: false,
        tagline: 'Track sales without paying a thing.',
        features: [
          'Sales & inventory tracking',
          'Up to 50 products',
          'Up to 200 sales per month',
          'Basic dashboard',
          '1 user',
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        priceLabel: formatPrice(pro.priceSubunit, currency),
        priceSubunit: pro.priceSubunit,
        interval: 'monthly',
        highlight: true,
        tagline: 'For the solo shop owner who wants AI working behind the counter.',
        features: [
          'Everything in Free',
          'Unlimited products & sales',
          'AI Assistant (all providers)',
          'AI-powered imports',
          'All-time Reports with AI insights',
          'Expenses & Payments modules',
        ],
      },
      {
        id: 'business',
        name: 'Business',
        priceLabel: formatPrice(business.priceSubunit, currency),
        priceSubunit: business.priceSubunit,
        interval: 'monthly',
        highlight: false,
        tagline: 'For owners who want a human in the loop when it matters.',
        features: [
          'Everything in Pro',
          'Priority email support (next business day)',
          '30-minute onboarding call',
          'Full data export on demand (JSON + CSV)',
          'Help migrating from spreadsheets',
          'Early access to new features',
        ],
      },
    ],
  });
}

const checkoutSchema = z.object({
  planId: z.enum(['pro', 'business']),
  callbackUrl: z.string().url().optional(),
});

export async function startCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!isPaystackConfigured()) {
      throw new HttpError(400, 'Payments are not configured on this deployment');
    }
    const input = checkoutSchema.parse(req.body || {});
    const businessId = req.auth!.businessId;
    const userId = req.auth!.userId;

    const [business, user] = await Promise.all([
      Business.findById(businessId),
      User.findById(userId),
    ]);
    if (!business || !user) throw new HttpError(404, 'Account not found');

    const planConfig = getPlanConfig(input.planId as PaidPlanId);
    const reference = `${input.planId}_${business._id.toString()}_${Date.now()}`;

    const init = await initializeTransaction({
      email: user.email,
      amountSubunit: planConfig.priceSubunit,
      currency: getBillingCurrency(),
      reference,
      callbackUrl: input.callbackUrl,
      planCode: planConfig.planCode,
      metadata: {
        businessId: business._id.toString(),
        userId: user._id.toString(),
        planId: input.planId,
        intent: 'subscription',
      },
    });

    res.json({
      authorizationUrl: init.authorization_url,
      accessCode: init.access_code,
      reference: init.reference,
    });
  } catch (err) {
    next(err);
  }
}

const verifySchema = z.object({ reference: z.string().min(3) });

export async function verifyCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = verifySchema.parse(req.body);
    const businessId = req.auth!.businessId;
    const business = await Business.findById(businessId);
    if (!business) throw new HttpError(404, 'Business not found');

    const tx = await verifyTransaction(input.reference);

    if (tx.status !== 'success') {
      res.json({ ok: false, status: tx.status });
      return;
    }

    // Read which plan was purchased from the transaction metadata we set at init.
    const metaPlan = (tx.metadata as any)?.planId;
    const plan: 'pro' | 'business' = metaPlan === 'business' ? 'business' : 'pro';

    const now = new Date();
    const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

    business.subscription = {
      ...business.subscription,
      plan,
      status: 'active',
      currentPeriodEnd,
      paystackCustomerCode:
        tx.customer?.customer_code || business.subscription?.paystackCustomerCode || null,
      lastPaymentReference: tx.reference,
      cancelAtPeriodEnd: false,
      trialEndsAt: business.subscription?.trialEndsAt ?? null,
      paystackSubscriptionCode: business.subscription?.paystackSubscriptionCode ?? null,
      paystackEmailToken: business.subscription?.paystackEmailToken ?? null,
    };
    await business.save();

    res.json({
      ok: true,
      plan,
      status: 'active',
      currentPeriodEnd: currentPeriodEnd.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.auth!.businessId;
    const business = await Business.findById(businessId);
    if (!business) throw new HttpError(404, 'Business not found');

    const sub = business.subscription;

    if (sub?.paystackSubscriptionCode && sub?.paystackEmailToken) {
      try {
        await disableSubscription(sub.paystackSubscriptionCode, sub.paystackEmailToken);
      } catch (e) {
        console.warn('Paystack disable failed:', (e as Error).message);
      }
    }

    business.subscription = {
      ...sub,
      cancelAtPeriodEnd: true,
    };
    await business.save();

    res.json({
      ok: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: business.subscription.currentPeriodEnd?.toISOString() || null,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBillingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.auth!.businessId;
    const business = await Business.findById(businessId);
    if (!business) throw new HttpError(404, 'Business not found');
    const sub = business.subscription;
    res.json({
      plan: sub?.plan || 'free',
      status: sub?.status || 'none',
      trialEndsAt: sub?.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
      currentPeriodEnd: sub?.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd || false,
    });
  } catch (err) {
    next(err);
  }
}
