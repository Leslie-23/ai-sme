import { Mistral } from '@mistralai/mistralai';
import { AIProvider, DEFAULT_MODELS } from './types';

export const mistralProvider: AIProvider = {
  name: 'mistral',
  defaultModel: DEFAULT_MODELS.mistral,
  async complete({ apiKey, model, system, userMessage }) {
    const client = new Mistral({ apiKey });
    const chosen = model || DEFAULT_MODELS.mistral;
    const response = await client.chat.complete({
      model: chosen,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
    });
    const content = response.choices?.[0]?.message?.content;
    const text =
      typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content
              .map((c) => ('text' in c ? c.text : ''))
              .filter(Boolean)
              .join('\n')
          : '';
    return { text, modelUsed: chosen };
  },
};
