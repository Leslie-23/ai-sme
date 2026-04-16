export type AIProviderName =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'openrouter'
  | 'mistral'
  | 'cohere';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  name: AIProviderName;
  defaultModel: string;
  complete(params: {
    apiKey: string;
    model?: string;
    system: string;
    userMessage: string;
  }): Promise<{ text: string; modelUsed: string }>;
}

export const DEFAULT_MODELS: Record<AIProviderName, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-opus-4-20250514',
  google: 'gemini-1.5-pro',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  mistral: 'mistral-large-latest',
  cohere: 'command-r-plus',
};

export const PROVIDER_LABELS: Record<AIProviderName, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  mistral: 'Mistral',
  cohere: 'Cohere',
};
