import { Types } from 'mongoose';
import { z } from 'zod';
import { getActiveProviderConfig } from './configService';
import { getProvider } from './ai';
import { Business } from '../models/Business';
import { Product } from '../models/Product';

export type ImportKind = 'products' | 'sales' | 'payments' | 'expenses' | 'auto';

// Shared enums
const PAYMENT_METHODS = ['CASH', 'MOMO', 'CARD', 'TRANSFER'] as const;

// Per-kind record schemas
export const importProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(100),
  category: z.string().min(1).max(100).default('Uncategorized'),
  unitPrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative().default(0),
  currentStock: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(5),
});
export type ImportProduct = z.infer<typeof importProductSchema>;

export const importSaleSchema = z.object({
  items: z
    .array(
      z.object({
        sku: z.string().min(1).max(100),
        quantity: z.number().int().positive(),
      })
    )
    .min(1)
    .max(40),
  paymentMethod: z.enum(PAYMENT_METHODS),
  createdAt: z.string().datetime().optional(),
});
export type ImportSale = z.infer<typeof importSaleSchema>;

export const importPaymentSchema = z.object({
  amount: z.number().nonnegative(),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().max(200).optional(),
  createdAt: z.string().datetime().optional(),
});
export type ImportPayment = z.infer<typeof importPaymentSchema>;

export const importExpenseSchema = z.object({
  amount: z.number().nonnegative(),
  category: z.string().min(1).max(100),
  description: z.string().max(400).optional(),
  createdAt: z.string().datetime().optional(),
});
export type ImportExpense = z.infer<typeof importExpenseSchema>;

export type ImportRecord = ImportProduct | ImportSale | ImportPayment | ImportExpense;

// Response envelope per kind
function responseSchema<T extends z.ZodTypeAny>(recordSchema: T) {
  return z.object({
    reply: z.string(),
    records: z.array(recordSchema).default([]),
    done: z.boolean().optional(),
  });
}

const productResponseSchema = responseSchema(importProductSchema);
const saleResponseSchema = responseSchema(importSaleSchema);
const paymentResponseSchema = responseSchema(importPaymentSchema);
const expenseResponseSchema = responseSchema(importExpenseSchema);

// Unified auto-classify shape — AI decides what kind each record is
export const importBucketsSchema = z.object({
  products: z.array(importProductSchema).default([]),
  sales: z.array(importSaleSchema).default([]),
  payments: z.array(importPaymentSchema).default([]),
  expenses: z.array(importExpenseSchema).default([]),
});
export type ImportBuckets = z.infer<typeof importBucketsSchema>;

const autoResponseSchema = z.object({
  reply: z.string(),
  records: importBucketsSchema.default({
    products: [],
    sales: [],
    payments: [],
    expenses: [],
  }),
  done: z.boolean().optional(),
});

function emptyBuckets(): ImportBuckets {
  return { products: [], sales: [], payments: [], expenses: [] };
}

export type ImportMessage = { role: 'user' | 'assistant'; text: string };

// -- SYSTEM PROMPTS --

const PRODUCT_SYSTEM_PROMPT = (
  businessName: string,
  currency: string,
  categories: string[],
  terminology: string,
  alreadyExtracted: number
) => `
You are a data import assistant for ${businessName}. Help the owner get their ${terminology} catalog into the system.

The business currency is ${currency}. Prices are in that currency unless stated otherwise. ${alreadyExtracted} ${terminology}(s) confirmed this session.
${categories.length > 0 ? `Known categories: ${categories.join(', ')}. Prefer these unless the user gives a new one.` : 'Categories are freeform — use whatever the user provides.'}

Behavior:
- Required fields per record: name, sku, unitPrice, costPrice, currentStock, category, lowStockThreshold.
- On paste/batch: extract every clearly-identified record. Skip records missing unitPrice — ask about them in "reply".
- Never invent a SKU. If missing, generate a short uppercase slug prefixed "GEN-" and mention it in "reply".
- Default lowStockThreshold=2 unless the user gives guidance.
- Warn if unitPrice <= costPrice.
- "reply" is concise — 2-4 sentences or bullet list.
- "done": true only if the user explicitly says they are finished.

OUTPUT FORMAT (strict): ONE JSON object, nothing else. No prose, no markdown fences.
{
  "reply": string,
  "records": [{ "name": string, "sku": string, "category": string, "unitPrice": number, "costPrice": number, "currentStock": number, "lowStockThreshold": number }],
  "done": boolean
}
`.trim();

const SALE_SYSTEM_PROMPT = (
  businessName: string,
  currency: string,
  knownSkus: { sku: string; name: string }[],
  alreadyExtracted: number
) => `
You are a sales import assistant for ${businessName}. Help the owner log past sales into the system.

Currency is ${currency}. ${alreadyExtracted} sale(s) confirmed this session.

Known products (use these SKUs — NEVER invent one):
${knownSkus.length > 0 ? knownSkus.map((p) => `- ${p.sku} · ${p.name}`).join('\n') : '(none yet — ask the user to import products first)'}

Behavior:
- Per sale, capture items (SKU + quantity), paymentMethod (CASH, MOMO, CARD, or TRANSFER), and an optional ISO createdAt.
- If a product name doesn't match a known SKU, DO NOT guess — exclude that sale and ask about it in "reply".
- If payment method is unclear, default to CASH but mention it in "reply".
- If date is unclear, omit createdAt (server uses now).
- "done": true only when user says they are finished.

OUTPUT FORMAT (strict): ONE JSON object, nothing else.
{
  "reply": string,
  "records": [{ "items": [{ "sku": string, "quantity": number }], "paymentMethod": "CASH"|"MOMO"|"CARD"|"TRANSFER", "createdAt"?: ISO8601 string }],
  "done": boolean
}
`.trim();

const PAYMENT_SYSTEM_PROMPT = (
  businessName: string,
  currency: string,
  alreadyExtracted: number
) => `
You are a payment import assistant for ${businessName}. Help the owner log non-sale money-in (deposits, refunds from suppliers, top-ups, etc.).

Currency is ${currency}. ${alreadyExtracted} payment(s) confirmed this session.

Behavior:
- Per payment, capture amount (non-negative number), method (CASH/MOMO/CARD/TRANSFER), optional reference (short note), optional ISO createdAt.
- If amount is negative (refund out / fee), tell the user — those belong in Expenses, not Payments.
- If method is unclear, default to TRANSFER but mention it in "reply".
- "done": true only when user says they are finished.

OUTPUT FORMAT (strict): ONE JSON object, nothing else.
{
  "reply": string,
  "records": [{ "amount": number, "method": "CASH"|"MOMO"|"CARD"|"TRANSFER", "reference"?: string, "createdAt"?: ISO8601 string }],
  "done": boolean
}
`.trim();

const EXPENSE_SYSTEM_PROMPT = (
  businessName: string,
  currency: string,
  alreadyExtracted: number
) => `
You are an expense import assistant for ${businessName}. Help the owner log operating expenses.

Currency is ${currency}. ${alreadyExtracted} expense(s) confirmed this session.

Common categories: Rent, Utilities, Marketing, Restocking, Supplies, Fees, Staff, Transport, Other. Prefer these unless the user gives a new one.

Behavior:
- Per expense, capture amount (positive), category (string), optional description, optional ISO createdAt.
- Treat the amount as always positive (the user is describing a cost).
- "done": true only when user says they are finished.

OUTPUT FORMAT (strict): ONE JSON object, nothing else.
{
  "reply": string,
  "records": [{ "amount": number, "category": string, "description"?: string, "createdAt"?: ISO8601 string }],
  "done": boolean
}
`.trim();

const AUTO_SYSTEM_PROMPT = (
  businessName: string,
  currency: string,
  categories: string[],
  terminology: string,
  knownSkus: { sku: string; name: string }[],
  counts: { products: number; sales: number; payments: number; expenses: number },
  focus: 'auto' | 'products' | 'sales' | 'payments' | 'expenses'
) => `
You are a universal data import assistant for ${businessName}. The owner will paste or describe data; you classify every item into the correct bucket — products, sales, payments, or expenses — and return them grouped.

${
  focus === 'auto'
    ? 'The user has not narrowed the type — classify freely across all four buckets.'
    : `The user is currently focused on "${focus}". Prefer that bucket when a record is ambiguous, but if a record is clearly a different kind, STILL classify it correctly into the right bucket — do not drop it.`
}

Currency: ${currency}. Terminology for what they sell: "${terminology}". Confirmed so far this session — products: ${counts.products}, sales: ${counts.sales}, payments: ${counts.payments}, expenses: ${counts.expenses}.
${categories.length > 0 ? `Known product categories: ${categories.join(', ')}.` : ''}

Known products (use these SKUs for sales — NEVER invent one):
${knownSkus.length > 0 ? knownSkus.map((p) => `- ${p.sku} · ${p.name}`).join('\n') : '(none yet)'}

Classification rules:
- PRODUCT: a catalog item with a name + price (e.g. "Nike Air Max, $120, 10 in stock"). Emit to "products".
- SALE: a transaction with quantity + product reference (e.g. "sold 2 Nike Air Max yesterday for cash"). Must match a known SKU — if the product isn't in the known list, DO NOT emit a sale; ask in "reply" whether to create the product first. Emit to "sales".
- PAYMENT: money IN that is not a product sale — deposits, top-ups, refunds received, transfers in (e.g. "received $500 deposit via MOMO"). Emit to "payments".
- EXPENSE: money OUT — rent, utilities, restocking, fees, salaries, supplies (e.g. "$2200 rent for April"). Always record the amount as positive. Emit to "expenses".

Per-bucket shape:
- products: { name, sku, category, unitPrice, costPrice, currentStock, lowStockThreshold }
  · Never invent a SKU. If missing, generate a short slug "GEN-XYZ" and mention it in "reply".
  · Default lowStockThreshold=2, costPrice=0, currentStock=0 when unknown.
- sales: { items: [{ sku, quantity }], paymentMethod: "CASH"|"MOMO"|"CARD"|"TRANSFER", createdAt?: ISO8601 }
  · Default paymentMethod to CASH if unclear, mention it in reply.
- payments: { amount, method: "CASH"|"MOMO"|"CARD"|"TRANSFER", reference?, createdAt?: ISO8601 }
- expenses: { amount (positive), category, description?, createdAt?: ISO8601 }
  · Common categories: Rent, Utilities, Marketing, Restocking, Supplies, Fees, Staff, Transport, Other.

Behavior:
- On paste/batch: extract every clearly-identified record, grouped into the right bucket. Leave others empty.
- Always return ALL FOUR bucket keys (use [] for empty) so the shape is stable.
- If a record is ambiguous (could be two kinds), ask in "reply" and omit it.
- "reply" is concise — 2-4 sentences or a short bullet list summarizing what you categorized.
- "done": true only if the user explicitly says they are finished.

OUTPUT FORMAT (strict): ONE JSON object, nothing else. No prose, no markdown fences.
{
  "reply": string,
  "records": {
    "products": [ { name, sku, category, unitPrice, costPrice, currentStock, lowStockThreshold } ],
    "sales": [ { items: [{sku, quantity}], paymentMethod, createdAt? } ],
    "payments": [ { amount, method, reference?, createdAt? } ],
    "expenses": [ { amount, category, description?, createdAt? } ]
  },
  "done": boolean
}
`.trim();

// -- HELPERS --

function stripJsonFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s.trim();
}

function messagesToText(messages: ImportMessage[]): string {
  return messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n\n');
}

// -- MAIN ENTRY --

export interface ExtractParams {
  kind: ImportKind;
  businessId: Types.ObjectId;
  messages: ImportMessage[];
  alreadyExtracted: number | { products: number; sales: number; payments: number; expenses: number };
}

export interface ExtractResult {
  reply: string;
  records: ImportBuckets;
  done: boolean;
  modelUsed: string;
}

export async function extractTurn(params: ExtractParams): Promise<ExtractResult> {
  const { kind, businessId, messages, alreadyExtracted } = params;

  const [business, providerConfig] = await Promise.all([
    Business.findById(businessId),
    getActiveProviderConfig(businessId),
  ]);
  const businessName = business?.name || 'the business';
  const currency = business?.currency || 'USD';
  const categories = Array.isArray(business?.categories) ? business!.categories : [];
  const terminology = business?.terminology || 'product';

  const countsByKind =
    typeof alreadyExtracted === 'number'
      ? { products: 0, sales: 0, payments: 0, expenses: 0, [kind]: alreadyExtracted } as {
          products: number;
          sales: number;
          payments: number;
          expenses: number;
        }
      : alreadyExtracted;
  const singleCount = typeof alreadyExtracted === 'number' ? alreadyExtracted : 0;

  // Always fetch known SKUs — needed for sales AND for auto mode
  const knownSkus =
    kind === 'sales' || kind === 'auto'
      ? await Product.find({ businessId })
          .select('sku name')
          .sort({ name: 1 })
          .limit(200)
          .lean()
      : [];

  let system: string;
  const isAuto = kind === 'auto';

  if (kind === 'auto') {
    system = AUTO_SYSTEM_PROMPT(
      businessName,
      currency,
      categories,
      terminology,
      knownSkus.map((p) => ({ sku: p.sku, name: p.name })),
      countsByKind
    );
  } else if (kind === 'products') {
    system = PRODUCT_SYSTEM_PROMPT(businessName, currency, categories, terminology, singleCount);
  } else if (kind === 'sales') {
    system = SALE_SYSTEM_PROMPT(
      businessName,
      currency,
      knownSkus.map((p) => ({ sku: p.sku, name: p.name })),
      singleCount
    );
  } else if (kind === 'payments') {
    system = PAYMENT_SYSTEM_PROMPT(businessName, currency, singleCount);
  } else {
    system = EXPENSE_SYSTEM_PROMPT(businessName, currency, singleCount);
  }

  const conversation = messagesToText(messages);
  const userMessage = `Conversation so far:\n\n${conversation}\n\nProduce the JSON response now.`;

  const provider = getProvider(providerConfig.provider);

  const call = async (extraInstruction?: string) => {
    const finalUser = extraInstruction ? `${userMessage}\n\n${extraInstruction}` : userMessage;
    return provider.complete({
      apiKey: providerConfig.apiKey,
      model: providerConfig.model || undefined,
      system,
      userMessage: finalUser,
    });
  };

  let { text, modelUsed } = await call();
  let reply = '';
  let records: ImportBuckets = emptyBuckets();
  let done = false;
  let parsed = false;
  let lastError = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const json = JSON.parse(stripJsonFences(text));
      if (isAuto) {
        const r = autoResponseSchema.parse(json);
        reply = r.reply;
        records = r.records;
        done = r.done ?? false;
      } else {
        let r:
          | z.infer<typeof productResponseSchema>
          | z.infer<typeof saleResponseSchema>
          | z.infer<typeof paymentResponseSchema>
          | z.infer<typeof expenseResponseSchema>;
        if (kind === 'products') r = productResponseSchema.parse(json);
        else if (kind === 'sales') r = saleResponseSchema.parse(json);
        else if (kind === 'payments') r = paymentResponseSchema.parse(json);
        else r = expenseResponseSchema.parse(json);
        reply = r.reply;
        done = r.done ?? false;
        records = emptyBuckets();
        if (kind === 'products') records.products = r.records as ImportProduct[];
        else if (kind === 'sales') records.sales = r.records as ImportSale[];
        else if (kind === 'payments') records.payments = r.records as ImportPayment[];
        else records.expenses = r.records as ImportExpense[];
      }
      parsed = true;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 0) {
        const retry = await call(
          `Your previous output could not be parsed (${lastError}). Reply again with a SINGLE valid JSON object matching the exact schema. No code fences, no prose outside JSON.`
        );
        text = retry.text;
        modelUsed = retry.modelUsed;
      }
    }
  }

  if (!parsed) {
    throw new Error(`AI returned invalid structured output: ${lastError}`);
  }

  return { reply, records, done, modelUsed };
}

// Backward-compat wrapper
export async function extractProductsTurn(params: {
  businessId: Types.ObjectId;
  messages: ImportMessage[];
  alreadyExtracted: number;
}): Promise<{ reply: string; records: ImportProduct[]; done: boolean; modelUsed: string }> {
  const r = await extractTurn({ kind: 'products', ...params });
  return { reply: r.reply, records: r.records.products, done: r.done, modelUsed: r.modelUsed };
}
