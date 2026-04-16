import { createOpenAICompatibleProvider } from './openaiCompatible';
import { DEFAULT_MODELS } from './types';

export const openrouterProvider = createOpenAICompatibleProvider({
  name: 'openrouter',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultModel: DEFAULT_MODELS.openrouter,
  defaultHeaders: {
    'HTTP-Referer': 'https://ai-sme.local',
    'X-Title': 'AI-SME',
  },
});
