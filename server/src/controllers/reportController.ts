import { Request, Response, NextFunction } from 'express';
import { buildAllTimeReport } from '../services/reportBuilder';
import { getActiveProviderConfig } from '../services/configService';
import { getProvider } from '../services/ai';
import { HttpError } from '../middleware/error';

export async function getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.auth!.businessId;
    const stats = await buildAllTimeReport(businessId);

    let providerConfig;
    try {
      providerConfig = await getActiveProviderConfig(businessId);
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }

    const system = `You are a business analyst writing an all-time performance report for ${stats.businessName}.
Use ONLY the JSON data provided. Do not invent numbers.
Format monetary amounts in ${stats.currency}.
Write in plain markdown with these sections in this order:
1. **Executive summary** (3-4 sentences covering revenue, profitability, and momentum)
2. **What's working** (bullet list of strengths backed by concrete numbers)
3. **What needs attention** (bullet list of risks — low stock, underperforming products, expense categories eating margin, negative trend, etc.)
4. **Recommendations** (3-5 concrete, prioritised actions the owner can take this week)
Be direct, avoid filler, cite specific figures. If a section has no data, say so briefly rather than padding.`;

    const userMessage = `Business stats (JSON):
\`\`\`json
${JSON.stringify(stats, null, 2)}
\`\`\`

Write the all-time report now.`;

    const provider = getProvider(providerConfig.provider);
    const { text, modelUsed } = await provider.complete({
      apiKey: providerConfig.apiKey,
      model: providerConfig.model || undefined,
      system,
      userMessage,
    });

    res.json({
      stats,
      report: text,
      modelUsed,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
