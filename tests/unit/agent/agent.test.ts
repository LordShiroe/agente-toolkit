import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Agent } from '../../../src/core/agent/Agent';
import { SlidingWindowMemoryManager } from '../../../src/core/memory/memory';
import { MockModelAdapter } from '../../utils/test-helpers';
import { mockCalculatorTool, testRunOptions } from '../../fixtures/agent-fixtures';
import { mockClaudeResponse } from '../../fixtures/claude-fixtures';

describe('Agent', () => {
  let agent: Agent;
  let memoryManager: SlidingWindowMemoryManager;
  let mockAdapter: MockModelAdapter;

  beforeEach(() => {
    memoryManager = new SlidingWindowMemoryManager(10);
    agent = new Agent(memoryManager);
    mockAdapter = new MockModelAdapter([mockClaudeResponse]);
  });

  describe('initialization', () => {
    it('should create agent with memory manager', () => {
      expect(agent).toBeDefined();
      expect(agent.getMemoryCount()).toBe(0);
    });

    it('should set and get prompt', () => {
      const testPrompt = 'You are a helpful assistant.';
      agent.setPrompt(testPrompt);
      expect(agent.getPrompt()).toBe(testPrompt);
    });
  });

  describe('memory operations', () => {
    it('should add memories', () => {
      agent.remember('User said hello', 'conversation', 0.7);
      expect(agent.getMemoryCount()).toBe(1);
    });

    it('should retrieve relevant memories', () => {
      agent.remember('User asked about weather in Tokyo', 'conversation', 0.8);
      agent.remember('User calculated 25 * 4', 'tool_result', 0.6);
      agent.remember('System error occurred', 'system', 0.5);

      const relevantMemories = agent.getRelevantMemories('weather Tokyo', 2);
      expect(relevantMemories.length).toBeGreaterThan(0);
      expect(relevantMemories.length).toBeLessThanOrEqual(2);
    });

    it('should get all memories', () => {
      agent.remember('Conversation memory', 'conversation', 0.7);
      agent.remember('Tool result memory', 'tool_result', 0.8);

      const allMemories = agent.getMemory();
      expect(allMemories).toHaveLength(2);
      expect(allMemories.some(m => m.type === 'conversation')).toBe(true);
      expect(allMemories.some(m => m.type === 'tool_result')).toBe(true);
    });
  });

  describe('tool management', () => {
    it('should add tools', () => {
      agent.addTool(mockCalculatorTool);
      // Tool was added successfully - we can't directly test this without getTools method
      // but we can test it doesn't throw an error
      expect(() => agent.addTool(mockCalculatorTool)).not.toThrow();
    });
  });

  describe('run method', () => {
    it('should execute and return response', async () => {
      const message = 'Hello, how are you?';
      const response = await agent.run(message, mockAdapter);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(mockAdapter.getCallCount()).toBeGreaterThan(0);
    });

    it('should store conversation in memory', async () => {
      const message = 'What is 15 + 27?';
      await agent.run(message, mockAdapter);

      expect(agent.getMemoryCount()).toBeGreaterThan(0);

      const memories = agent.getMemory();
      const userMessage = memories.find(m => m.content.includes(message));
      expect(userMessage).toBeDefined();
    });

    it('should respect run options', async () => {
      const message = 'Test message';
      const options = { ...testRunOptions };

      const response = await agent.run(message, mockAdapter, options);
      expect(response).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const errorAdapter = new MockModelAdapter([
        {
          error: { message: 'API Error' },
        },
      ]);

      const response = await agent.run('Test', errorAdapter);

      // Agent should return an error message instead of throwing
      expect(response).toContain('Execution failed');
      expect(response).toContain('API Error');
    });
  });

  describe('tool execution', () => {
    beforeEach(() => {
      agent.addTool(mockCalculatorTool);
    });

    it('should execute tools when available', async () => {
      const toolAdapter = new MockModelAdapter([
        {
          content: [
            {
              type: 'tool_use',
              name: 'calculator',
              input: { expression: '15 + 27' },
            },
          ],
        },
      ]);

      const response = await agent.run('Calculate 15 + 27', toolAdapter);
      expect(response).toBeDefined();
    });
  });

  describe('prompt system', () => {
    it('should use custom prompt when set', () => {
      const customPrompt = 'You are a specialized math tutor.';
      agent.setPrompt(customPrompt);

      expect(agent.getPrompt()).toBe(customPrompt);
    });

    it('should have default prompt behavior', () => {
      const defaultPrompt = agent.getPrompt();
      expect(defaultPrompt).toBeDefined();
      expect(typeof defaultPrompt).toBe('string');
    });
  });

  describe('memory integration', () => {
    it('should use memory context in conversations', async () => {
      // Add some context to memory
      agent.remember('User prefers metric units', 'fact', 0.9);
      agent.remember('Previous conversation about temperature', 'conversation', 0.7);

      const response = await agent.run('What about the weather?', mockAdapter);

      // Should have added the new message to memory
      expect(agent.getMemoryCount()).toBeGreaterThan(2);
    });

    it('should maintain conversation history', async () => {
      await agent.run('Hello', mockAdapter);
      await agent.run('How are you?', mockAdapter);
      await agent.run('What can you do?', mockAdapter);

      const memories = agent.getMemory();
      const conversationMemories = memories.filter(m => m.type === 'conversation');

      expect(conversationMemories.length).toBeGreaterThan(0);
    });
  });
});
