import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getActiveProviderConfig } from '../services/configService';
import { getProvider } from '../services/ai';
import { retrieveSupportDocs } from '../services/supportKnowledge';
import { SupportQueryLog } from '../models/SupportQueryLog';
import { HttpError } from '../middleware/error';

const supportQuerySchema = z.object({
  userQuery: z.string().min(1).max(2000),
});

export async function runSupportQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = supportQuerySchema.parse(req.body);
    const businessId = req.auth!.businessId;
    const docs = retrieveSupportDocs(input.userQuery, 4);

    const providerConfig = await getActiveProviderConfig(businessId).catch((e) => {
      throw new HttpError(400, (e as Error).message);
    });

    const system = `You are Lexa, the in-app support assistant for Intellexa.
Your job is to help users with app usage, setup, troubleshooting, complaints, and basic workflow questions.
Use only the retrieved support knowledge below. If the knowledge is not enough, say what information you need and suggest contacting assisted setup.
Do not answer business-performance questions, calculate sales, or invent account data. Tell users to use Intellexa for business-data questions.
Keep responses short, calm, and practical. Give step-by-step instructions when useful.
For complaints or bugs, ask for the affected screen, exact error text, what they clicked, and whether they want assisted setup follow-up.`;

    const knowledge = docs
      .map((doc, idx) => `Source ${idx + 1}: ${doc.title}\n${doc.body}`)
      .join('\n\n');

    const userMessage = `Retrieved support knowledge:
${knowledge || 'No matching support document was found.'}

User question or complaint:
${input.userQuery}`;

    const provider = getProvider(providerConfig.provider);
    const { text, modelUsed } = await provider.complete({
      apiKey: providerConfig.apiKey,
      model: providerConfig.model || undefined,
      system,
      userMessage,
    });

    await SupportQueryLog.create({
      userQuery: input.userQuery,
      retrievedDocIds: docs.map((d) => d.id),
      aiResponse: text,
      modelUsed,
      businessId,
      userId: req.auth!.userId,
    });

    res.json({
      response: text,
      modelUsed,
      sources: docs.map((d) => ({ id: d.id, title: d.title })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
