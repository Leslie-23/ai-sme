import { Request, Response } from 'express';
import { Business } from '../models/Business';
import { verifyWebhookSignature } from '../services/paystack';

// Mounted with express.raw(), so req.body is a Buffer. We parse it ourselves
// so we can verify the signature against the exact bytes Paystack signed.
export async function paystackWebhook(req: Request, res: Response): Promise<void> {
  const raw = req.body as Buffer;
  const sig = req.header('x-paystack-signature');

  if (!verifyWebhookSignature(raw, sig)) {
    res.status(401).json({ ok: false, error: 'invalid signature' });
    return;
  }

  let event: { event: string; data: Record<string, any> };
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    res.status(400).json({ ok: false, error: 'invalid json' });
    return;
  }

  try {
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      case 'subscription.create':
        await handleSubscriptionCreate(event.data);
        break;
      case 'subscription.disable':
      case 'subscription.not_renew':
        await handleSubscriptionDisable(event.data);
        break;
      case 'invoice.payment_failed':
      case 'invoice.create':
        // Paystack fires these around renewals; only mark past_due on failure.
        if (event.event === 'invoice.payment_failed') {
          await handlePaymentFailed(event.data);
        }
        break;
      default:
        // Acknowledge unknown events so Paystack doesn't retry forever.
        break;
    }
  } catch (e) {
    console.error('paystack webhook handler error:', (e as Error).message);
    // Still 200 — we've verified signature and logged; retrying won't help.
  }

  res.json({ ok: true });
}

async function handleChargeSuccess(data: Record<string, any>): Promise<void> {
  const businessId = data?.metadata?.businessId;
  if (!businessId) return;
  const business = await Business.findById(businessId);
  if (!business) return;

  const metaPlan = data?.metadata?.planId;
  const plan: 'pro' | 'business' = metaPlan === 'business' ? 'business' : 'pro';

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  business.subscription = {
    ...business.subscription,
    plan,
    status: 'active',
    currentPeriodEnd: periodEnd,
    paystackCustomerCode:
      data?.customer?.customer_code || business.subscription?.paystackCustomerCode || null,
    lastPaymentReference: data?.reference || business.subscription?.lastPaymentReference || null,
    cancelAtPeriodEnd: false,
    trialEndsAt: business.subscription?.trialEndsAt ?? null,
    paystackSubscriptionCode: business.subscription?.paystackSubscriptionCode ?? null,
    paystackEmailToken: business.subscription?.paystackEmailToken ?? null,
  };
  await business.save();
}

async function handleSubscriptionCreate(data: Record<string, any>): Promise<void> {
  const customerCode = data?.customer?.customer_code;
  if (!customerCode) return;
  const business = await Business.findOne({ 'subscription.paystackCustomerCode': customerCode });
  if (!business) return;

  const nextPaymentDate = data?.next_payment_date ? new Date(data.next_payment_date) : null;

  business.subscription = {
    ...business.subscription,
    plan: business.subscription?.plan === 'business' ? 'business' : 'pro',
    status: 'active',
    paystackSubscriptionCode: data?.subscription_code || business.subscription?.paystackSubscriptionCode || null,
    paystackEmailToken: data?.email_token || business.subscription?.paystackEmailToken || null,
    currentPeriodEnd: nextPaymentDate || business.subscription?.currentPeriodEnd || null,
  };
  await business.save();
}

async function handleSubscriptionDisable(data: Record<string, any>): Promise<void> {
  const subCode = data?.subscription_code;
  if (!subCode) return;
  const business = await Business.findOne({ 'subscription.paystackSubscriptionCode': subCode });
  if (!business) return;
  business.subscription = {
    ...business.subscription,
    cancelAtPeriodEnd: true,
  };
  await business.save();
}

async function handlePaymentFailed(data: Record<string, any>): Promise<void> {
  const customerCode = data?.customer?.customer_code;
  if (!customerCode) return;
  const business = await Business.findOne({ 'subscription.paystackCustomerCode': customerCode });
  if (!business) return;
  business.subscription = {
    ...business.subscription,
    status: 'past_due',
  };
  await business.save();
}
