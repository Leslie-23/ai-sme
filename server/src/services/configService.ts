import { Types } from 'mongoose';
import { Config } from '../models/Config';
import { encrypt, decrypt } from '../utils/crypto';
import { AIProviderName } from './ai';

export const API_KEY_CONFIG: Record<AIProviderName, string> = {
  openai: 'ai.apiKey.openai',
  anthropic: 'ai.apiKey.anthropic',
  google: 'ai.apiKey.google',
  groq: 'ai.apiKey.groq',
  openrouter: 'ai.apiKey.openrouter',
  mistral: 'ai.apiKey.mistral',
  cohere: 'ai.apiKey.cohere',
};

export const CONFIG_KEYS = {
  aiProvider: 'ai.provider',
  aiModel: 'ai.model',
} as const;

export const ALL_PROVIDERS: AIProviderName[] = [
  'openai',
  'anthropic',
  'google',
  'groq',
  'openrouter',
  'mistral',
  'cohere',
];

async function getRaw(businessId: Types.ObjectId, key: string): Promise<string | null> {
  const doc = await Config.findOne({ businessId, key });
  return doc ? doc.value : null;
}

async function setRaw(businessId: Types.ObjectId, key: string, value: string): Promise<void> {
  await Config.findOneAndUpdate(
    { businessId, key },
    { value },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function getPlainConfig(businessId: Types.ObjectId, key: string): Promise<string | null> {
  return getRaw(businessId, key);
}

export async function setPlainConfig(
  businessId: Types.ObjectId,
  key: string,
  value: string
): Promise<void> {
  await setRaw(businessId, key, value);
}

export async function getEncryptedConfig(
  businessId: Types.ObjectId,
  key: string
): Promise<string | null> {
  const raw = await getRaw(businessId, key);
  if (!raw) return null;
  try {
    return decrypt(raw);
  } catch {
    return null;
  }
}

export async function setEncryptedConfig(
  businessId: Types.ObjectId,
  key: string,
  value: string
): Promise<void> {
  await setRaw(businessId, key, encrypt(value));
}

export async function getActiveProviderConfig(businessId: Types.ObjectId): Promise<{
  provider: AIProviderName;
  model: string | null;
  apiKey: string;
}> {
  const provider = ((await getRaw(businessId, CONFIG_KEYS.aiProvider)) as AIProviderName) || 'openai';
  const model = await getRaw(businessId, CONFIG_KEYS.aiModel);
  const apiKey = await getEncryptedConfig(businessId, API_KEY_CONFIG[provider]);
  if (!apiKey) {
    throw new Error(`No API key configured for provider ${provider}`);
  }
  return { provider, model, apiKey };
}
