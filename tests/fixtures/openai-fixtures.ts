// Mock OpenAI API responses for testing

export const mockOpenAIResponse = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: 1677652288,
  model: 'gpt-4o',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant' as const,
        content: 'I can help you with that calculation. The answer is 42.',
      },
      finish_reason: 'stop' as const,
    },
  ],
  usage: {
    prompt_tokens: 15,
    completion_tokens: 25,
    total_tokens: 40,
  },
};

export const mockOpenAIToolResponse = {
  id: 'chatcmpl-456',
  object: 'chat.completion',
  created: 1677652289,
  model: 'gpt-4o',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant' as const,
        content: null,
        tool_calls: [
          {
            id: 'call_123',
            type: 'function' as const,
            function: {
              name: 'calculator',
              arguments: '{"operation": "add", "a": 20, "b": 22}',
            },
          },
        ],
      },
      finish_reason: 'tool_calls' as const,
    },
  ],
  usage: {
    prompt_tokens: 25,
    completion_tokens: 30,
    total_tokens: 55,
  },
};

export const mockOpenAIFollowUpResponse = {
  id: 'chatcmpl-789',
  object: 'chat.completion',
  created: 1677652290,
  model: 'gpt-4o',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant' as const,
        content: 'The calculation result is 42. This demonstrates how the calculator tool works.',
      },
      finish_reason: 'stop' as const,
    },
  ],
  usage: {
    prompt_tokens: 35,
    completion_tokens: 20,
    total_tokens: 55,
  },
};

export const mockOpenAIError = {
  error: {
    message: 'Invalid API key provided',
    type: 'invalid_request_error',
    param: null,
    code: 'invalid_api_key',
  },
};

import { vi } from 'vitest';

export const createMockOpenAIClient = () => ({
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
});