import OpenAI from 'openai';
import { AIProvider, AIProviderName } from './types';

export function createOpenAICompatibleProvider(opts: {
  name: AIProviderName;
  baseURL: string;
  defaultModel: string;
  defaultHeaders?: Record<string, string>;
}): AIProvider {
  return {
    name: opts.name,
    defaultModel: opts.defaultModel,
    async complete({ apiKey, model, system, userMessage }) {
      const client = new OpenAI({
        apiKey,
        baseURL: opts.baseURL,
        defaultHeaders: opts.defaultHeaders,
      });
      const chosen = model || opts.defaultModel;
      const response = await client.chat.completions.create({
        model: chosen,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
      });
      const text = response.choices[0]?.message?.content || '';
      return { text, modelUsed: chosen };
    },
  };
}
