import { OpenAIAdapter } from '../../../src/infrastructure/adapters/openai/openaiAdapter';

export type LLMAdapter = InstanceType<typeof OpenAIAdapter>;

export function createOpenAIAdapter(): LLMAdapter {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required for OpenAI adapter');
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  return new OpenAIAdapter(apiKey, model);
}
