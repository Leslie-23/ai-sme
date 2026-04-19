import crypto from 'crypto';

const PAYSTACK_BASE = 'https://api.paystack.co';

export type PaidPlanId = 'pro' | 'business';

function secretKey(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  return k;
}

function publicKey(): string {
  const k = process.env.PAYSTACK_PUBLIC_KEY;
  if (!k) throw new Error('PAYSTACK_PUBLIC_KEY is not configured');
  return k;
}

export function getPublicKey(): string {
  return publicKey();
}

export function isPaystackConfigured(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY && !!process.env.PAYSTACK_PUBLIC_KEY;
}

// Paystack sends amounts in the currency's smallest unit: kobo for NGN,
// cents for USD. Defaults here assume USD cents.
export function getBillingCurrency(): string {
  return process.env.PAYSTACK_CURRENCY || 'USD';
}

interface PlanConfig {
  priceSubunit: number; // cents for USD, kobo for NGN
  planCode: string | null;
}

// Defaults are USD. Override per-plan via env when you wire up real Paystack plans.
const PLAN_DEFAULTS: Record<PaidPlanId, { priceSubunit: number }> = {
  pro: { priceSubunit: 1500 }, // $15.00
  business: { priceSubunit: 3900 }, // $39.00
};

export function getPlanConfig(plan: PaidPlanId): PlanConfig {
  if (plan === 'pro') {
    return {
      priceSubunit: parseInt(
        process.env.PAYSTACK_PRO_PRICE_SUBUNIT || String(PLAN_DEFAULTS.pro.priceSubunit),
        10
      ),
      planCode: process.env.PAYSTACK_PRO_PLAN_CODE || null,
    };
  }
  return {
    priceSubunit: parseInt(
      process.env.PAYSTACK_BUSINESS_PRICE_SUBUNIT || String(PLAN_DEFAULTS.business.priceSubunit),
      10
    ),
    planCode: process.env.PAYSTACK_BUSINESS_PLAN_CODE || null,
  };
}

async function paystackFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok || (body && body.status === false)) {
    const msg = body?.message || `Paystack ${path} failed (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

export interface InitTransactionParams {
  email: string;
  amountSubunit: number;
  currency?: string;
  reference?: string;
  callbackUrl?: string;
  planCode?: string | null;
  metadata?: Record<string, unknown>;
}

export interface InitTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializeTransaction(
  params: InitTransactionParams
): Promise<InitTransactionResult> {
  const body: Record<string, unknown> = {
    email: params.email,
    amount: params.amountSubunit,
    currency: params.currency || getBillingCurrency(),
  };
  if (params.reference) body.reference = params.reference;
  if (params.callbackUrl) body.callback_url = params.callbackUrl;
  if (params.planCode) body.plan = params.planCode;
  if (params.metadata) body.metadata = params.metadata;

  const res = await paystackFetch<{ data: InitTransactionResult }>(
    '/transaction/initialize',
    { method: 'POST', body: JSON.stringify(body) }
  );
  return res.data;
}

export interface VerifyTransactionResult {
  status: 'success' | 'failed' | 'abandoned' | string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  customer: { email: string; customer_code: string };
  plan?: string | null;
  plan_object?: { plan_code: string; interval: string } | null;
  metadata?: Record<string, unknown> | null;
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  const res = await paystackFetch<{ data: VerifyTransactionResult }>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
  return res.data;
}

export interface FetchSubscriptionResult {
  subscription_code: string;
  email_token: string;
  status: string;
  next_payment_date: string | null;
  plan: { plan_code: string };
  customer: { customer_code: string; email: string };
}

export async function fetchSubscription(code: string): Promise<FetchSubscriptionResult> {
  const res = await paystackFetch<{ data: FetchSubscriptionResult }>(
    `/subscription/${encodeURIComponent(code)}`
  );
  return res.data;
}

export async function disableSubscription(code: string, token: string): Promise<void> {
  await paystackFetch('/subscription/disable', {
    method: 'POST',
    body: JSON.stringify({ code, token }),
  });
}

// Webhook signature check — Paystack signs the raw request body with
// HMAC-SHA512 using the secret key and sends the hex digest in x-paystack-signature.
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string | undefined): boolean {
  if (!signature) return false;
  const hash = crypto.createHmac('sha512', secretKey()).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}
