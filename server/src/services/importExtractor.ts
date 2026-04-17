import { Types } from 'mongoose';
import { z } from 'zod';
import { getActiveProviderConfig } from './configService';
import { getProvider } from './ai';
import { Business } from '../models/Business';

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

const extractResponseSchema = z.object({
  reply: z.string(),
  records: z.array(importProductSchema).default([]),
  done: z.boolean().optional(),
});

export type ImportMessage = { role: 'user' | 'assistant'; text: string };

const PRODUCT_SYSTEM_PROMPT = (businessName: string, currency: string, alreadyExtracted: number) => `
You are a data import assistant for ${businessName}. Your job is to help the business owner get their product catalog into the system through conversation.

The business currency is ${currency}. All prices the user mentions are in that currency unless stated otherwise. So far ${alreadyExtracted} product(s) have been confirmed in this session.

Behavior:
- Ask clarifying questions naturally to fill required fields: name, sku, unitPrice (selling price), costPrice, currentStock, category.
- If the user pastes a batch (copied list, table, messy text), extract every clearly-identified product. For products where a required field is missing (especially unitPrice), exclude them from "records" and ask about them in "reply".
- Never invent a SKU. If a SKU is missing, ask or derive a short uppercase slug from the name (prefix with "GEN-") and mention the generated SKU in your reply.
- Use lowStockThreshold=2 by default unless the user gives guidance.
- unitPrice > costPrice by default. Warn if the user enters the opposite.
- Keep "reply" concise — 2-4 short sentences or a bullet list.
- Signal "done": true only when the user explicitly says they are finished.

OUTPUT FORMAT (strict):
Respond with ONE JSON object and nothing else. No prose outside JSON. No markdown code fences.
{
  "reply": string,              // what to show the user in the chat
  "records": [                  // products confidently extracted this turn (may be empty)
    {
      "name": string,
      "sku": string,
      "category": string,
      "unitPrice": number,
      "costPrice": number,
      "currentStock": number,
      "lowStockThreshold": number
    }
  ],
  "done": boolean               // true iff user says they are finished
}
`.trim();

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

export async function extractProductsTurn(params: {
  businessId: Types.ObjectId;
  messages: ImportMessage[];
  alreadyExtracted: number;
}): Promise<{ reply: string; records: ImportProduct[]; done: boolean; modelUsed: string }> {
  const { businessId, messages, alreadyExtracted } = params;

  const [business, providerConfig] = await Promise.all([
    Business.findById(businessId),
    getActiveProviderConfig(businessId),
  ]);
  const businessName = business?.name || 'the business';
  const currency = business?.currency || 'USD';

  const system = PRODUCT_SYSTEM_PROMPT(businessName, currency, alreadyExtracted);
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
  let parsed: z.infer<typeof extractResponseSchema> | null = null;
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const json = JSON.parse(stripJsonFences(text));
      parsed = extractResponseSchema.parse(json);
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

  return {
    reply: parsed.reply,
    records: parsed.records,
    done: parsed.done ?? false,
    modelUsed,
  };
}
