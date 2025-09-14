import { ModelAdapter } from './base';
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeAdapter implements ModelAdapter {
  name = 'claude';
  private defaultModel = 'claude-sonnet-4-20250514';
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required for ClaudeAdapter');
    }
    this.apiKey = apiKey;
  }

  async complete(prompt: string, options?: { model?: string }): Promise<string> {
    const client = new Anthropic({ apiKey: this.apiKey });
    const modelToUse = options?.model || this.defaultModel;

    try {
      const response = await client.messages.create({
        model: modelToUse,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      });
      const content = response.content && response.content[0];
      if (content?.type === 'text') {
        return content.text;
      }
      return JSON.stringify(response);
    } catch (error) {
      throw new Error(
        `Claude API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
