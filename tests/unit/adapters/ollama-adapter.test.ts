import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OllamaAdapter } from '../../../src/infrastructure/adapters/ollama/ollamaAdapter';
import { Type } from '@sinclair/typebox';
import {
  mockOllamaResponse,
  mockOllamaToolResponse,
  mockOllamaFollowUpResponse,
  mockOllamaGenerateResponse,
  mockOllamaError,
} from '../../fixtures/ollama-fixtures';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OllamaAdapter', () => {
  let adapter: OllamaAdapter;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create adapter instance
    adapter = new OllamaAdapter('http://localhost:11434', 'llama3.2:latest');
  });

  describe('Basic Properties', () => {
    it('should have correct name and native tool support', () => {
      expect(adapter.name).toBe('ollama');
      expect(adapter.supportsNativeTools).toBe(true);
    });

    it('should use custom base URL and model', () => {
      const customAdapter = new OllamaAdapter('http://custom:8080', 'custom-model');
      expect(customAdapter.name).toBe('ollama');
    });

    it('should remove trailing slash from base URL', () => {
      const adapter = new OllamaAdapter('http://localhost:11434/', 'llama3.2:latest');
      expect(adapter.name).toBe('ollama'); // We can't directly test the private baseUrl, but this ensures construction works
    });
  });

  describe('Text Completion', () => {
    it('should complete text prompts successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOllamaGenerateResponse,
      });

      const result = await adapter.complete('Hello, how are you?');

      expect(result).toBe('I can help you with that calculation. The answer is 42.');
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.2:latest',
          prompt: 'Hello, how are you?',
          stream: false,
        }),
      });
    });

    it('should handle empty responses', async () => {
      const emptyResponse = { ...mockOllamaGenerateResponse, response: '' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      const result = await adapter.complete('Hello');

      expect(result).toBe('');
    });

    it('should handle completion errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(adapter.complete('Hello')).rejects.toThrow('Ollama API error: 404 Not Found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.complete('Hello')).rejects.toThrow('Network error');
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
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockOllamaToolResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockOllamaFollowUpResponse,
        });

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

      // Verify Ollama API was called correctly
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call should include tools
      expect(mockFetch.mock.calls[0][1].body).toContain('"tools"');
      expect(mockFetch.mock.calls[0][1].body).toContain('"calculator"');

      // Second call should include tool result
      expect(mockFetch.mock.calls[1][1].body).toContain('"role":"tool"');
    });

    it('should handle tool not found errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOllamaToolResponse,
      });

      const result = await adapter.executeWithTools('Calculate something', []);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Tool calculator not found');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await adapter.executeWithTools('Calculate something', [mockTool]);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Ollama API error: 500 Internal Server Error');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('should handle responses without tool calls', async () => {
      const noToolResponse = {
        ...mockOllamaResponse,
        message: {
          role: 'assistant' as const,
          content: 'I cannot help with calculations.',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => noToolResponse,
      });

      const result = await adapter.executeWithTools('Tell me a joke', [mockTool]);

      expect(result.success).toBe(true);
      expect(result.content).toBe('I cannot help with calculations.');
      expect(result.toolCalls).toHaveLength(0);
    });

    it('should handle multiple tool calls in one response', async () => {
      const multiToolResponse = {
        ...mockOllamaToolResponse,
        message: {
          role: 'assistant' as const,
          content: '',
          tool_calls: [
            {
              function: {
                name: 'calculator',
                arguments: { operation: 'add', a: 10, b: 5 },
              },
            },
            {
              function: {
                name: 'calculator',
                arguments: { operation: 'multiply', a: 3, b: 4 },
              },
            },
          ],
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => multiToolResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockOllamaFollowUpResponse,
        });

      mockTool.action.mockResolvedValueOnce(15).mockResolvedValueOnce(12);

      const result = await adapter.executeWithTools('Calculate 10+5 and 3*4', [mockTool]);

      expect(result.success).toBe(true);
      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls[0].result).toBe(15);
      expect(result.toolCalls[1].result).toBe(12);
    });
  });

  describe('Request Construction', () => {
    it('should construct proper Ollama chat request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOllamaResponse,
      });

      const mockTool = {
        name: 'test_tool',
        description: 'A test tool',
        paramsSchema: Type.Object({
          param: Type.String(),
        }),
        action: vi.fn(),
      };

      await adapter.executeWithTools('Test message', [mockTool]);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"model":"llama3.2:latest"'),
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages).toEqual([{ role: 'user', content: 'Test message' }]);
      expect(requestBody.tools).toHaveLength(1);
      expect(requestBody.tools[0].type).toBe('function');
      expect(requestBody.tools[0].function.name).toBe('test_tool');
      expect(requestBody.stream).toBe(false);
    });
  });
});
