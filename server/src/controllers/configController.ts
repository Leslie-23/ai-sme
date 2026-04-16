import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ALL_PROVIDERS,
  API_KEY_CONFIG,
  CONFIG_KEYS,
  getPlainConfig,
  setPlainConfig,
  setEncryptedConfig,
  getEncryptedConfig,
} from '../services/configService';
import { DEFAULT_MODELS, PROVIDER_LABELS, AIProviderName } from '../services/ai';
import { maskSecret } from '../utils/crypto';

const providerEnum = z.enum([
  'openai',
  'anthropic',
  'google',
  'groq',
  'openrouter',
  'mistral',
  'cohere',
]);

const updateSchema = z.object({
  provider: providerEnum.optional(),
  model: z.string().optional(),
  apiKeys: z.record(providerEnum, z.string().optional()).optional(),
});

export async function getConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.auth!.businessId;
    const [provider, model, ...keys] = await Promise.all([
      getPlainConfig(businessId, CONFIG_KEYS.aiProvider),
      getPlainConfig(businessId, CONFIG_KEYS.aiModel),
      ...ALL_PROVIDERS.map((p) => getEncryptedConfig(businessId, API_KEY_CONFIG[p])),
    ]);

    const apiKeyMasks: Record<AIProviderName, string | null> = {} as Record<
      AIProviderName,
      string | null
    >;
    ALL_PROVIDERS.forEach((p, i) => {
      const key = keys[i];
      apiKeyMasks[p] = key ? maskSecret(key) : null;
    });

    res.json({
      provider: provider || 'openai',
      model: model || null,
      defaultModels: DEFAULT_MODELS,
      providerLabels: PROVIDER_LABELS,
      providers: ALL_PROVIDERS,
      apiKeyMasks,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateSchema.parse(req.body);
    const businessId = req.auth!.businessId;
    const writes: Promise<void>[] = [];
    if (input.provider) writes.push(setPlainConfig(businessId, CONFIG_KEYS.aiProvider, input.provider));
    if (input.model !== undefined) writes.push(setPlainConfig(businessId, CONFIG_KEYS.aiModel, input.model));
    if (input.apiKeys) {
      for (const [provider, value] of Object.entries(input.apiKeys)) {
        if (value) writes.push(setEncryptedConfig(businessId, API_KEY_CONFIG[provider as AIProviderName], value));
      }
    }
    await Promise.all(writes);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
