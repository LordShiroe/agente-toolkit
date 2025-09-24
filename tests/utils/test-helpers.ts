import { vi } from 'vitest';
import { ModelAdapter } from '../../src/infrastructure/adapters/base/base';
import { mockClaudeResponse, mockClaudeToolResponse } from '../fixtures/claude-fixtures';

// Mock Model Adapter for testing
export class MockModelAdapter implements ModelAdapter {
  name = 'mock-adapter';
  supportsNativeTools = true;
  
  private responses: any[];
  private currentResponseIndex = 0;
  public callHistory: Array<{
    prompt: string;
    tools?: any[];
    options?: any;
    timestamp: Date;
  }> = [];

  constructor(responses: any[] = [mockClaudeResponse]) {
    this.responses = responses;
  }

  async complete(prompt: string): Promise<string> {
    // Record the call
    this.callHistory.push({
      prompt,
      timestamp: new Date()
    });

    const response = this.responses[this.currentResponseIndex] || this.responses[0];
    this.currentResponseIndex = (this.currentResponseIndex + 1) % this.responses.length;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 10));

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Extract text content from response
    if (response.content && Array.isArray(response.content)) {
      const textContent = response.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
      return textContent || 'Mock response';
    }

    return 'Mock response';
  }

  async executeWithTools(prompt: string, tools: any[]): Promise<any> {
    // Record the call
    this.callHistory.push({
      prompt,
      tools,
      timestamp: new Date()
    });

    const response = this.responses[this.currentResponseIndex] || this.responses[0];
    this.currentResponseIndex = (this.currentResponseIndex + 1) % this.responses.length;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 10));

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Mock tool execution result
    return {
      content: 'Mock tool execution result',
      toolCalls: [
        {
          name: 'calculator',
          arguments: { expression: '15 + 27' },
          result: 42
        }
      ],
      success: true
    };
  }

  // Helper methods for testing
  setResponses(responses: any[]) {
    this.responses = responses;
    this.currentResponseIndex = 0;
  }

  getCallCount(): number {
    return this.callHistory.length;
  }

  getLastCall() {
    return this.callHistory[this.callHistory.length - 1];
  }

  reset() {
    this.callHistory = [];
    this.currentResponseIndex = 0;
  }
}

// Utility functions for testing
export function createMockAdapter(responses?: any[]): MockModelAdapter {
  return new MockModelAdapter(responses);
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Environment variable helpers
export function withTestEnv<T>(envVars: Record<string, string>, fn: () => T): T {
  const originalEnv = { ...process.env };
  
  // Set test environment variables
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  try {
    return fn();
  } finally {
    // Restore original environment
    process.env = originalEnv;
  }
}

// Mock console methods to capture logs during tests
export function captureConsole() {
  const logs: any[] = [];
  const errors: any[] = [];
  const warns: any[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = vi.fn((...args) => logs.push(args));
  console.error = vi.fn((...args) => errors.push(args));
  console.warn = vi.fn((...args) => warns.push(args));

  return {
    logs,
    errors,
    warns,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  };
}

// Performance testing utilities
export async function measurePerformance<T>(
  fn: () => Promise<T>,
  iterations = 1
): Promise<{ result: T; avgTime: number; minTime: number; maxTime: number }> {
  const times: number[] = [];
  let result: T;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await fn();
    const end = performance.now();
    times.push(end - start);
  }

  return {
    result: result!,
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times)
  };
}