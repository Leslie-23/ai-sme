import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { buildAIContext } from '../services/aiContextBuilder';
import { getActiveProviderConfig } from '../services/configService';
import { getProvider } from '../services/ai';
import { AIQueryLog } from '../models/AIQueryLog';
import { Business } from '../models/Business';
import { HttpError } from '../middleware/error';

const querySchema = z.object({
  userQuery: z.string().min(1).max(4000),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
});

export async function runAIQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = querySchema.parse(req.body);
    const businessId = req.auth!.businessId;

    const [business, context, providerConfig] = await Promise.all([
      Business.findById(businessId),
      buildAIContext(businessId, input.dateRange),
      getActiveProviderConfig(businessId).catch((e) => {
        throw new HttpError(400, (e as Error).message);
      }),
    ]);

    const businessName = business?.name || 'the business';

    const system = `You are a business intelligence assistant for ${businessName}.
You have access to real business data provided below as JSON.
Answer the owner's question accurately using ONLY the data provided.
If data is insufficient, say so clearly. Do not fabricate numbers.
Format monetary values using the business currency (${context.currency}).
Be concise, use bullet points when appropriate, and surface concrete numbers.`;

    const userMessage = `Business context (JSON):
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

Question: ${input.userQuery}`;

    const provider = getProvider(providerConfig.provider);
    const { text, modelUsed } = await provider.complete({
      apiKey: providerConfig.apiKey,
      model: providerConfig.model || undefined,
      system,
      userMessage,
    });

    await AIQueryLog.create({
      userQuery: input.userQuery,
      contextSnapshot: context as unknown as Record<string, unknown>,
      aiResponse: text,
      modelUsed,
      businessId,
      userId: req.auth!.userId,
    });

    res.json({
      response: text,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
