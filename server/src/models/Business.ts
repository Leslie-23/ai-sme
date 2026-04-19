import { Schema, model, Document, Types } from 'mongoose';

export type Terminology = 'product' | 'item' | 'service';

export interface IBusinessFeatures {
  chat: boolean;
  imports: boolean;
  expenses: boolean;
  payments: boolean;
}

export type SubscriptionPlan = 'free' | 'pro' | 'business';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';

export interface ISubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  paystackCustomerCode: string | null;
  paystackSubscriptionCode: string | null;
  paystackEmailToken: string | null;
  lastPaymentReference: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface IBusiness extends Document {
  _id: Types.ObjectId;
  name: string;
  owner: Types.ObjectId;
  currency: string;
  timezone: string;
  features: IBusinessFeatures;
  terminology: Terminology;
  categories: string[];
  subscription: ISubscription;
  createdAt: Date;
  updatedAt: Date;
}

const FeaturesSchema = new Schema<IBusinessFeatures>(
  {
    chat: { type: Boolean, default: true },
    imports: { type: Boolean, default: true },
    expenses: { type: Boolean, default: true },
    payments: { type: Boolean, default: true },
  },
  { _id: false }
);

const SubscriptionSchema = new Schema<ISubscription>(
  {
    plan: { type: String, enum: ['free', 'pro', 'business'], default: 'free' },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'canceled', 'none'],
      default: 'none',
    },
    trialEndsAt: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    paystackCustomerCode: { type: String, default: null },
    paystackSubscriptionCode: { type: String, default: null },
    paystackEmailToken: { type: String, default: null },
    lastPaymentReference: { type: String, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { _id: false }
);

const TRIAL_DAYS = 14;

function defaultSubscription(): ISubscription {
  const now = Date.now();
  return {
    plan: 'pro',
    status: 'trialing',
    trialEndsAt: new Date(now + TRIAL_DAYS * 24 * 3600 * 1000),
    currentPeriodEnd: null,
    paystackCustomerCode: null,
    paystackSubscriptionCode: null,
    paystackEmailToken: null,
    lastPaymentReference: null,
    cancelAtPeriodEnd: false,
  };
}

const BusinessSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    currency: { type: String, default: 'USD', uppercase: true },
    timezone: { type: String, default: 'UTC' },
    features: {
      type: FeaturesSchema,
      default: () => ({ chat: true, imports: true, expenses: true, payments: true }),
    },
    terminology: {
      type: String,
      enum: ['product', 'item', 'service'],
      default: 'product',
    },
    categories: { type: [String], default: [] },
    subscription: {
      type: SubscriptionSchema,
      default: defaultSubscription,
    },
  },
  { timestamps: true }
);

export const Business = model<IBusiness>('Business', BusinessSchema);

export const DEFAULT_FEATURES: IBusinessFeatures = {
  chat: true,
  imports: true,
  expenses: true,
  payments: true,
};

export function normalizeFeatures(input: Partial<IBusinessFeatures> | undefined | null): IBusinessFeatures {
  return {
    chat: input?.chat ?? DEFAULT_FEATURES.chat,
    imports: input?.imports ?? DEFAULT_FEATURES.imports,
    expenses: input?.expenses ?? DEFAULT_FEATURES.expenses,
    payments: input?.payments ?? DEFAULT_FEATURES.payments,
  };
}

export function normalizeSubscription(input: Partial<ISubscription> | undefined | null): ISubscription {
  const def = defaultSubscription();
  return {
    plan: input?.plan ?? def.plan,
    status: input?.status ?? def.status,
    trialEndsAt: input?.trialEndsAt ?? def.trialEndsAt,
    currentPeriodEnd: input?.currentPeriodEnd ?? null,
    paystackCustomerCode: input?.paystackCustomerCode ?? null,
    paystackSubscriptionCode: input?.paystackSubscriptionCode ?? null,
    paystackEmailToken: input?.paystackEmailToken ?? null,
    lastPaymentReference: input?.lastPaymentReference ?? null,
    cancelAtPeriodEnd: input?.cancelAtPeriodEnd ?? false,
  };
}

// Existing Business docs from before the subscription schema existed will
// have sub = undefined on read. Give them a fresh trial the first time we
// see them so they aren't punished for being early users.
export function backfillSubscriptionIfMissing(business: IBusiness): boolean {
  if (business.subscription && business.subscription.status && business.subscription.status !== 'none') {
    return false;
  }
  business.subscription = {
    ...defaultSubscription(),
    // Never overwrite these if partially present.
    paystackCustomerCode: business.subscription?.paystackCustomerCode ?? null,
    paystackSubscriptionCode: business.subscription?.paystackSubscriptionCode ?? null,
    paystackEmailToken: business.subscription?.paystackEmailToken ?? null,
  };
  return true;
}

// Pro access = any paid plan (pro/business) AND status is trialing/active
// AND trial or period hasn't expired.
export function hasProAccess(sub: ISubscription | undefined | null): boolean {
  if (!sub) return false;
  if (sub.plan !== 'pro' && sub.plan !== 'business') return false;
  const now = Date.now();
  if (sub.status === 'trialing') {
    return !!sub.trialEndsAt && sub.trialEndsAt.getTime() > now;
  }
  if (sub.status === 'active') {
    if (!sub.currentPeriodEnd) return true;
    return sub.currentPeriodEnd.getTime() > now;
  }
  return false;
}
