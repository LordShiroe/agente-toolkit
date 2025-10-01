import { vi } from 'vitest';

// Mock Ollama API responses for testing

export const mockOllamaResponse = {
  model: 'llama3.2:latest',
  created_at: '2025-10-01T03:01:35.238158168Z',
  message: {
    role: 'assistant' as const,
    content: 'I can help you with that calculation. The answer is 42.',
  },
  done: true,
  done_reason: 'stop',
  total_duration: 1668828641,
  load_duration: 84635386,
  prompt_eval_count: 26,
  prompt_eval_duration: 38262337,
  eval_count: 32,
  eval_duration: 1545239772,
};

export const mockOllamaToolResponse = {
  model: 'llama3.2:latest',
  created_at: '2025-10-01T03:01:35.238158168Z',
  message: {
    role: 'assistant' as const,
    content: '',
    tool_calls: [
      {
        function: {
          name: 'calculator',
          arguments: {
            operation: 'add',
            a: 20,
            b: 22,
          },
        },
      },
    ],
  },
  done: true,
  done_reason: 'stop',
  total_duration: 885095291,
  load_duration: 3753500,
  prompt_eval_count: 122,
  prompt_eval_duration: 328493000,
  eval_count: 33,
  eval_duration: 552222000,
};

export const mockOllamaFollowUpResponse = {
  model: 'llama3.2:latest',
  created_at: '2025-10-01T03:01:36.238158168Z',
  message: {
    role: 'assistant' as const,
    content: 'The calculation result is 42. This demonstrates how the calculator tool works.',
  },
  done: true,
  done_reason: 'stop',
  total_duration: 1234567890,
  load_duration: 12345678,
  prompt_eval_count: 45,
  prompt_eval_duration: 123456789,
  eval_count: 25,
  eval_duration: 987654321,
};

export const mockOllamaGenerateResponse = {
  model: 'llama3.2:latest',
  created_at: '2025-10-01T03:01:35.238158168Z',
  response: 'I can help you with that calculation. The answer is 42.',
  done: true,
  done_reason: 'stop',
  context: [128006, 9125, 128007, 271],
  total_duration: 1668828641,
  load_duration: 84635386,
  prompt_eval_count: 26,
  prompt_eval_duration: 38262337,
  eval_count: 32,
  eval_duration: 1545239772,
};

export const mockOllamaError = {
  error: 'model not found',
};

export const createMockFetch = () => {
  return vi.fn();
};
