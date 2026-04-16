import OpenAI from 'openai';
import { AIProvider, DEFAULT_MODELS } from './types';

export const openaiProvider: AIProvider = {
  name: 'openai',
  defaultModel: DEFAULT_MODELS.openai,
  async complete({ apiKey, model, system, userMessage }) {
    const client = new OpenAI({ apiKey });
    const chosen = model || DEFAULT_MODELS.openai;
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
