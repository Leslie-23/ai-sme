import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, DEFAULT_MODELS } from './types';

export const anthropicProvider: AIProvider = {
  name: 'anthropic',
  defaultModel: DEFAULT_MODELS.anthropic,
  async complete({ apiKey, model, system, userMessage }) {
    const client = new Anthropic({ apiKey });
    const chosen = model || DEFAULT_MODELS.anthropic;
    const response = await client.messages.create({
      model: chosen,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = response.content[0];
    const text = block && block.type === 'text' ? block.text : '';
    return { text, modelUsed: chosen };
  },
};
