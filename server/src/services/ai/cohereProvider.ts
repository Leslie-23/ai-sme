import { CohereClientV2 } from 'cohere-ai';
import { AIProvider, DEFAULT_MODELS } from './types';

export const cohereProvider: AIProvider = {
  name: 'cohere',
  defaultModel: DEFAULT_MODELS.cohere,
  async complete({ apiKey, model, system, userMessage }) {
    const client = new CohereClientV2({ token: apiKey });
    const chosen = model || DEFAULT_MODELS.cohere;
    const response = await client.chat({
      model: chosen,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
    });
    const parts = response.message?.content || [];
    const text = parts
      .map((p) => ('text' in p ? p.text : ''))
      .filter(Boolean)
      .join('\n');
    return { text, modelUsed: chosen };
  },
};
