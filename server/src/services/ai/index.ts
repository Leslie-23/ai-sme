import { AIProvider, AIProviderName } from './types';
import { openaiProvider } from './openaiProvider';
import { anthropicProvider } from './anthropicProvider';
import { googleProvider } from './googleProvider';
import { groqProvider } from './groqProvider';
import { openrouterProvider } from './openrouterProvider';
import { mistralProvider } from './mistralProvider';
import { cohereProvider } from './cohereProvider';

const registry: Record<AIProviderName, AIProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
  groq: groqProvider,
  openrouter: openrouterProvider,
  mistral: mistralProvider,
  cohere: cohereProvider,
};

export function getProvider(name: AIProviderName): AIProvider {
  const p = registry[name];
  if (!p) throw new Error(`Unknown AI provider: ${name}`);
  return p;
}

export { DEFAULT_MODELS, PROVIDER_LABELS } from './types';
export type { AIProvider, AIProviderName } from './types';
