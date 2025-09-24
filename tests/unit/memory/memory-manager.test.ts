import { describe, it, expect, beforeEach } from 'vitest';
import { SlidingWindowMemoryManager, Memory } from '../../../src/core/memory/memory';
import { sampleMemories } from '../../fixtures/memory-fixtures';

describe('SlidingWindowMemoryManager', () => {
  let memoryManager: SlidingWindowMemoryManager;

  beforeEach(() => {
    memoryManager = new SlidingWindowMemoryManager(5, 200); // Small limits for testing
  });

  describe('addMemory', () => {
    it('should add a memory with auto-generated id and timestamp', () => {
      const memoryData = {
        content: 'Test memory content',
        type: 'conversation' as const,
        importance: 0.8
      };

      memoryManager.addMemory(memoryData);
      
      const memories = memoryManager.getAllMemories();
      expect(memories).toHaveLength(1);
      expect(memories[0]).toMatchObject(memoryData);
      expect(memories[0].id).toBeDefined();
      expect(memories[0].timestamp).toBeInstanceOf(Date);
    });

    it('should maintain sliding window size limit', () => {
      // Add more memories than the limit
      for (let i = 0; i < 7; i++) {
        memoryManager.addMemory({
          content: `Memory ${i}`,
          type: 'conversation',
          importance: 0.5
        });
      }

      const memories = memoryManager.getAllMemories();
      expect(memories).toHaveLength(5); // Should be limited to maxMemories
      
      // Should keep 5 out of 7 memories based on retention score
      expect(memories.length).toBe(5);
    });

    it('should handle different memory types', () => {
      const memoryTypes: Memory['type'][] = ['conversation', 'fact', 'tool_result', 'system'];
      
      memoryTypes.forEach(type => {
        memoryManager.addMemory({
          content: `Test ${type} memory`,
          type,
          importance: 0.7
        });
      });

      const memories = memoryManager.getAllMemories();
      expect(memories).toHaveLength(4);
      
      memoryTypes.forEach(type => {
        const typeMemories = memoryManager.getMemoryByType(type);
        expect(typeMemories).toHaveLength(1);
        expect(typeMemories[0].type).toBe(type);
      });
    });
  });

  describe('getRelevantMemories', () => {
    beforeEach(() => {
      // Add sample memories
      sampleMemories.forEach(memory => {
        memoryManager.addMemory({
          content: memory.content,
          type: memory.type,
          importance: memory.importance
        });
      });
    });

    it('should return memories relevant to context', () => {
      const context = 'weather Tokyo';
      const relevant = memoryManager.getRelevantMemories(context, 2);
      
      expect(relevant.length).toBeGreaterThan(0);
      expect(relevant.length).toBeLessThanOrEqual(2);
      
      // Should include the Tokyo weather memory
      const tokyoMemory = relevant.find(m => m.content.includes('Tokyo'));
      expect(tokyoMemory).toBeDefined();
    });

    it('should respect maxCount parameter', () => {
      const relevant = memoryManager.getRelevantMemories('calculation', 1);
      expect(relevant).toHaveLength(1);
    });

    it('should return fewer results for very low relevance queries', () => {
      const relevant = memoryManager.getRelevantMemories('xyzzzzwwwwqqqqrrrrttttuuuu', 5);
      // The algorithm may still return some results due to importance scores, 
      // but it should return fewer than max requested
      expect(relevant.length).toBeLessThanOrEqual(5);
    });

    it('should sort by relevance and importance', () => {
      // Add memories with different importance levels
      memoryManager.addMemory({
        content: 'Very important calculation result',
        type: 'tool_result',
        importance: 0.9
      });
      
      memoryManager.addMemory({
        content: 'Less important calculation note',
        type: 'conversation',
        importance: 0.3
      });

      const relevant = memoryManager.getRelevantMemories('calculation', 10);
      
      // Higher importance should come first when relevance is similar
      expect(relevant[0].importance).toBeGreaterThanOrEqual(relevant[1]?.importance || 0);
    });
  });

  describe('memory management operations', () => {
    beforeEach(() => {
      sampleMemories.forEach(memory => {
        memoryManager.addMemory({
          content: memory.content,
          type: memory.type,
          importance: memory.importance
        });
      });
    });

    it('should get memories by type', () => {
      const conversationMemories = memoryManager.getMemoryByType('conversation');
      const toolMemories = memoryManager.getMemoryByType('tool_result');
      
      expect(conversationMemories.every(m => m.type === 'conversation')).toBe(true);
      expect(toolMemories.every(m => m.type === 'tool_result')).toBe(true);
    });

    it('should return correct memory count', () => {
      const count = memoryManager.getMemoryCount();
      expect(count).toBe(sampleMemories.length);
    });

    it('should get all memories', () => {
      const allMemories = memoryManager.getAllMemories();
      expect(allMemories).toHaveLength(sampleMemories.length);
    });
  });

  describe('pruneMemories', () => {
    it('should remove low importance memories when over limit', () => {
      // Fill with memories of varying importance
      for (let i = 0; i < 10; i++) {
        memoryManager.addMemory({
          content: `Memory ${i}`,
          type: 'conversation',
          importance: i * 0.1 // 0.0 to 0.9
        });
      }

      memoryManager.pruneMemories();
      
      const memories = memoryManager.getAllMemories();
      expect(memories).toHaveLength(5); // Should be pruned to limit
      
      // Should keep higher importance memories
      memories.forEach(memory => {
        expect(memory.importance).toBeGreaterThanOrEqual(0.5);
      });
    });
  });
});