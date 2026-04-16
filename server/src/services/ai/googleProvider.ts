import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, DEFAULT_MODELS } from './types';

export const googleProvider: AIProvider = {
  name: 'google',
  defaultModel: DEFAULT_MODELS.google,
  async complete({ apiKey, model, system, userMessage }) {
    const chosen = model || DEFAULT_MODELS.google;
    const client = new GoogleGenerativeAI(apiKey);
    const gen = client.getGenerativeModel({ model: chosen, systemInstruction: system });
    const result = await gen.generateContent(userMessage);
    const text = result.response.text();
    return { text, modelUsed: chosen };
  },
};
