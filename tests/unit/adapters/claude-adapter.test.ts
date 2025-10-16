import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeAdapter } from '../../../src/infrastructure/adapters/claude/claudeAdapter';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{"name":"Test"}' }],
        }),
      },
    })),
  };
});

describe('ClaudeAdapter structured output', () => {
  let adapter: ClaudeAdapter;
  let mockCreate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ClaudeAdapter('test-key', 'claude-sonnet-4-20250514');
    mockCreate = (adapter as any).client.messages.create;
  });

  it('adds JSON instruction when json option provided', async () => {
    await adapter.complete('Give me a name', { json: true });
    // First call, inspect messages argument
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content.toLowerCase()).toContain('return only a valid json object');
  });

  it('injects schema instruction when schema provided', async () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
    await adapter.complete('Give me a name', { schema });
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain('JSON Schema:');
    expect(callArgs.messages[0].content).toContain('"name"');
  });
});
