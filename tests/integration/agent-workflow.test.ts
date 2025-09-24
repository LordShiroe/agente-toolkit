import { describe, it, expect, beforeEach } from 'vitest';
import { Agent } from '../../src/core/agent/Agent';
import { SlidingWindowMemoryManager } from '../../src/core/memory/memory';
import { MockModelAdapter } from '../utils/test-helpers';
import { mockCalculatorTool } from '../fixtures/agent-fixtures';

describe('Agent Integration Tests', () => {
  let agent: Agent;
  let mockAdapter: MockModelAdapter;

  beforeEach(() => {
    const memoryManager = new SlidingWindowMemoryManager(20);
    agent = new Agent(memoryManager);
    mockAdapter = new MockModelAdapter([
      {
        content: [
          { type: 'text', text: 'Hello! I can help you with calculations and general questions.' },
        ],
      },
    ]);
  });

  describe('End-to-End Agent Workflow', () => {
    it('should handle a complete conversation with memory', async () => {
      // Set up agent with prompt and tools
      agent.setPrompt('You are a helpful assistant with access to calculation tools.');
      agent.addTool(mockCalculatorTool);

      // First interaction
      const response1 = await agent.run('Hello, can you help me?', mockAdapter);
      expect(response1).toBeDefined();
      expect(agent.getMemoryCount()).toBeGreaterThan(0);

      // Second interaction - should remember previous context
      const response2 = await agent.run('What can you do?', mockAdapter);
      expect(response2).toBeDefined();
      expect(agent.getMemoryCount()).toBeGreaterThan(2); // At least user + agent messages from both interactions

      // Verify conversation history is maintained
      const memories = agent.getMemory();
      const conversationMemories = memories.filter(m => m.type === 'conversation');
      expect(conversationMemories.length).toBeGreaterThanOrEqual(4); // 2 user + 2 agent responses
    });

    it('should maintain context across multiple tool uses', async () => {
      agent.addTool(mockCalculatorTool);

      // Multiple calculations that could build on each other
      await agent.run('Calculate 15 + 27', mockAdapter);
      expect(agent.getMemoryCount()).toBeGreaterThan(0);

      await agent.run('Now multiply that result by 2', mockAdapter);

      // Should have memory of both interactions
      const memories = agent.getMemory();
      expect(memories.some(m => m.content.includes('15 + 27'))).toBe(true);
      expect(memories.some(m => m.content.includes('multiply'))).toBe(true);
    });

    it('should handle relevant memory retrieval', async () => {
      // Add diverse memories
      agent.remember('User prefers Celsius temperature', 'fact', 0.9);
      agent.remember('Calculated area of circle with radius 5', 'tool_result', 0.7);
      agent.remember('User asked about weather in Tokyo', 'conversation', 0.8);
      agent.remember('System logged an error', 'system', 0.5);

      // Test memory retrieval for temperature-related query
      const tempMemories = agent.getRelevantMemories('temperature weather', 2);
      expect(tempMemories.length).toBeGreaterThan(0);

      // Test memory retrieval for calculation-related query
      const calcMemories = agent.getRelevantMemories('calculation math', 2);
      expect(calcMemories.length).toBeGreaterThan(0);
    });
  });

  describe('Agent with Tools Integration', () => {
    beforeEach(() => {
      agent.addTool(mockCalculatorTool);
    });

    it('should successfully execute tool workflows', async () => {
      const toolAdapter = new MockModelAdapter([
        {
          content: [
            { type: 'text', text: 'I can calculate that for you using my calculator tool.' },
          ],
        },
      ]);

      const response = await agent.run('What is 25 * 4?', toolAdapter);

      expect(response).toBeDefined();
      expect(toolAdapter.getCallCount()).toBeGreaterThan(0);

      // Verify the interaction was recorded in memory
      const memories = agent.getMemory();
      expect(memories.some(m => m.content.includes('25 * 4'))).toBe(true);
    });
  });

  describe('Memory Persistence Through Sessions', () => {
    it('should accumulate and maintain memories across multiple runs', async () => {
      const initialMemoryCount = agent.getMemoryCount();

      // Simulate a series of interactions
      const interactions = [
        'Hello, I need help with math',
        'Calculate 10 + 5',
        'What about 20 - 8?',
        'Thank you for the help',
      ];

      for (const message of interactions) {
        await agent.run(message, mockAdapter);
      }

      const finalMemoryCount = agent.getMemoryCount();
      expect(finalMemoryCount).toBeGreaterThan(initialMemoryCount);

      // Should have memories from all interactions
      const memories = agent.getMemory();
      interactions.forEach(interaction => {
        expect(memories.some(m => m.content.includes(interaction))).toBe(true);
      });
    });
  });
});
