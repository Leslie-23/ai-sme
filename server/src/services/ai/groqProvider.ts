import { createOpenAICompatibleProvider } from './openaiCompatible';
import { DEFAULT_MODELS } from './types';

export const groqProvider = createOpenAICompatibleProvider({
  name: 'groq',
  baseURL: 'https://api.groq.com/openai/v1',
  defaultModel: DEFAULT_MODELS.groq,
});
