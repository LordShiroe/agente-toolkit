import { Agent } from '../../src/core/agent/Agent';
import { AgentRegistration } from '../../src/core/agent/types/AgentMetadata';
import { SlidingWindowMemoryManager } from '../../src/core/memory/memory';
import { Tool } from '../../src/core/tools/types/Tool';
import { Type } from '@sinclair/typebox';

// Mock tool for testing
export const mockCalculatorTool: Tool<any, number> = {
  name: 'calculator',
  description: 'Performs basic arithmetic calculations',
  paramsSchema: Type.Object({
    expression: Type.String({ description: 'Mathematical expression to evaluate' }),
  }),
  action: async params => {
    // Simple calculator for testing
    const expression = params.expression.replace(/[^0-9+\-*/().\s]/g, '');
    try {
      return eval(expression);
    } catch {
      throw new Error('Invalid mathematical expression');
    }
  },
};

export const mockMemoryTool: Tool<any, string[]> = {
  name: 'memory_search',
  description: 'Search through previous conversations and memories',
  paramsSchema: Type.Object({
    query: Type.String({ description: 'Search query for finding relevant memories' }),
    maxResults: Type.Optional(Type.Number({ description: 'Maximum number of results to return' })),
  }),
  action: async params => {
    // Mock memory search results
    return [
      'Found: User asked about weather in Tokyo',
      'Found: Successfully calculated 25 * 4 = 100',
    ];
  },
};

// Test agent registration
export const mockAgentRegistration: AgentRegistration = {
  metadata: {
    id: 'test-agent',
    name: 'Test Agent',
    description: 'A test agent for unit testing',
    categories: ['test', 'utility'],
    keywords: ['test', 'mock', 'utility'],
    priority: 1,
    enabled: true,
  },
  capabilities: {
    taskTypes: ['calculation', 'memory', 'general'],
    examples: ['Calculate 15 + 27', 'Search for previous conversations', 'Help with basic tasks'],
    limitations: ['Cannot access external APIs in test mode'],
  },
};

// Factory function to create test agents
export function createTestAgent(options?: {
  prompt?: string;
  tools?: Tool<any, any>[];
  memorySize?: number;
}): Agent {
  const memoryManager = new SlidingWindowMemoryManager(options?.memorySize || 10);
  const agent = new Agent(memoryManager);

  if (options?.prompt) {
    agent.setPrompt(options.prompt);
  }

  if (options?.tools) {
    options.tools.forEach(tool => agent.addTool(tool));
  }

  return agent;
}

// Sample run options for testing
export const testRunOptions = {
  maxSteps: 3,
  timeoutMs: 5000,
  temperature: 0.1,
  maxTokens: 500,
};
