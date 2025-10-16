import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeAdapter } from '../../../src/infrastructure/adapters/claude/claudeAdapter';

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: '[{"id":"step1","toolName":"t","params":{},"dependsOn":[]}]' }],
        }),
      },
    })),
  };
});

describe('ClaudeAdapter JSON array prompt handling', () => {
  let adapter: ClaudeAdapter;
  let mockCreate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ClaudeAdapter('test');
    mockCreate = (adapter as any).client.messages.create;
  });

  it('injects array instruction when prompt expects JSON array', async () => {
    const plannerPrompt = 'Create an execution plan. Respond ONLY with a JSON array of steps:';
    await adapter.complete(plannerPrompt, { json: true });
    const args = mockCreate.mock.calls[0][0];
    const injected = args.messages[0].content as string;
    expect(injected.toLowerCase()).toContain('json array');
  });
});
