import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIAdapter } from '../../../src/infrastructure/adapters/openai/openaiAdapter';
import { Type } from '@sinclair/typebox';
import {
  mockOpenAIResponse,
  mockOpenAIToolResponse,
  mockOpenAIFollowUpResponse,
} from '../../fixtures/openai-fixtures';

// Mock the OpenAI SDK
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;
  let mockCreate: any;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create adapter instance
    adapter = new OpenAIAdapter('test-api-key', 'gpt-4o');

    // Get the mocked create function
    mockCreate = (adapter as any).client.chat.completions.create;
  });

  describe('Basic Properties', () => {
    it('should have correct name and native tool support', () => {
      expect(adapter.name).toBe('openai');
      expect(adapter.supportsNativeTools).toBe(true);
    });
  });

  describe('Text Completion', () => {
    it('should complete text prompts successfully', async () => {
      mockCreate.mockResolvedValueOnce(mockOpenAIResponse);

      const result = await adapter.complete('Hello, how are you?');

      expect(result).toBe('I can help you with that calculation. The answer is 42.');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
        max_tokens: 4096,
      });
    });

    it('should handle empty responses', async () => {
      const emptyResponse = {
        ...mockOpenAIResponse,
        choices: [
          { ...mockOpenAIResponse.choices[0], message: { role: 'assistant', content: null } },
        ],
      };
      mockCreate.mockResolvedValueOnce(emptyResponse);

      const result = await adapter.complete('Hello');

      expect(result).toBe('');
    });

    it('should handle completion errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      await expect(adapter.complete('Hello')).rejects.toThrow('API Error');
    });

    it('should request json_object response_format when json option used', async () => {
      mockCreate.mockResolvedValueOnce(mockOpenAIResponse);

      await adapter.complete('Return an object', { json: true });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: 'json_object' },
        })
      );
    });

    it('should request json_schema response_format when schema option used', async () => {
      mockCreate.mockResolvedValueOnce(mockOpenAIResponse);
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };

      await adapter.complete('Return an object', { schema });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: expect.objectContaining({
            type: 'json_schema',
            json_schema: expect.objectContaining({ schema }),
          }),
        })
      );
    });
  });

  describe('Tool Execution', () => {
    const mockTool = {
      name: 'calculator',
      description: 'Performs basic arithmetic operations',
      paramsSchema: Type.Object({
        operation: Type.String(),
        a: Type.Number(),
        b: Type.Number(),
      }),
      action: vi.fn().mockResolvedValue(42),
    };

    it('should execute tools successfully', async () => {
      // Mock the conversation flow: tool call -> tool result -> final response
      mockCreate
        .mockResolvedValueOnce(mockOpenAIToolResponse)
        .mockResolvedValueOnce(mockOpenAIFollowUpResponse);

      const result = await adapter.executeWithTools('Calculate 20 + 22', [mockTool]);

      expect(result.success).toBe(true);
      expect(result.content).toBe(
        'The calculation result is 42. This demonstrates how the calculator tool works.'
      );
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0]).toEqual({
        name: 'calculator',
        arguments: { operation: 'add', a: 20, b: 22 },
        result: 42,
      });

      // Verify tool was called with correct arguments
      expect(mockTool.action).toHaveBeenCalledWith({
        operation: 'add',
        a: 20,
        b: 22,
      });

      // Verify OpenAI API was called correctly
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should handle tool not found errors', async () => {
      mockCreate.mockResolvedValueOnce(mockOpenAIToolResponse);

      const result = await adapter.executeWithTools('Calculate something', []);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Tool calculator not found');
    });

    it('should handle invalid JSON in tool arguments', async () => {
      const invalidJsonResponse = {
        ...mockOpenAIToolResponse,
        choices: [
          {
            ...mockOpenAIToolResponse.choices[0],
            message: {
              ...mockOpenAIToolResponse.choices[0].message,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function' as const,
                  function: {
                    name: 'calculator',
                    arguments: 'invalid json',
                  },
                },
              ],
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(invalidJsonResponse);

      const result = await adapter.executeWithTools('Calculate something', [mockTool]);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Invalid JSON in tool arguments');
    });

    it('should handle execution errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.executeWithTools('Calculate something', [mockTool]);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network error');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('should handle responses without tool calls', async () => {
      const noToolResponse = {
        ...mockOpenAIResponse,
        choices: [
          {
            ...mockOpenAIResponse.choices[0],
            message: {
              role: 'assistant' as const,
              content: 'I cannot help with calculations.',
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(noToolResponse);

      const result = await adapter.executeWithTools('Tell me a joke', [mockTool]);

      expect(result.success).toBe(true);
      expect(result.content).toBe('I cannot help with calculations.');
      expect(result.toolCalls).toHaveLength(0);
    });
  });
});
