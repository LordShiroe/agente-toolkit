import { describe, it, expect, beforeEach } from 'vitest';
import { Agent } from '../../src/core/agent/Agent';
import { SlidingWindowMemoryManager } from '../../src/core/memory/memory';
import { MockModelAdapter } from '../utils/test-helpers';
import { measurePerformance } from '../utils/test-helpers';
import { mockCalculatorTool } from '../fixtures/agent-fixtures';
// TODO: Actually do real benchmarks here
describe('Performance Benchmarks', () => {
  let agent: Agent;
  let mockAdapter: MockModelAdapter;

  beforeEach(() => {
    const memoryManager = new SlidingWindowMemoryManager(50);
    agent = new Agent(memoryManager);
    mockAdapter = new MockModelAdapter([
      {
        content: [{ type: 'text', text: 'Mock response for performance testing' }],
      },
    ]);
  });

  describe('Agent Response Performance', () => {
    it('should complete basic agent runs within reasonable time', async () => {
      const { avgTime, minTime, maxTime } = await measurePerformance(
        () => agent.run('Test message', mockAdapter),
        5
      );

      console.log(`Agent Run Performance:
        Average: ${avgTime.toFixed(2)}ms
        Min: ${minTime.toFixed(2)}ms  
        Max: ${maxTime.toFixed(2)}ms`);

      // Basic performance expectations (adjust based on your requirements)
      expect(avgTime).toBeLessThan(1000); // Should complete in under 1 second on average
      expect(maxTime).toBeLessThan(2000); // No single run should take more than 2 seconds
    });

    it('should handle memory operations efficiently', async () => {
      // Pre-populate with memories
      for (let i = 0; i < 20; i++) {
        agent.remember(`Test memory ${i}`, 'conversation', Math.random());
      }

      const { avgTime } = await measurePerformance(
        async () => agent.getRelevantMemories('test query', 5),
        10
      );

      console.log(`Memory Retrieval Performance: ${avgTime.toFixed(2)}ms average`);

      // Memory operations should be fast
      expect(avgTime).toBeLessThan(50); // Should complete in under 50ms on average
    });
  });

  describe('Tool Execution Performance', () => {
    beforeEach(() => {
      agent.addTool(mockCalculatorTool);
    });

    it('should execute tools efficiently', async () => {
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

      const { avgTime, minTime, maxTime } = await measurePerformance(
        () => agent.run('Calculate 15 + 27', toolAdapter),
        3
      );

      console.log(`Tool Execution Performance:
        Average: ${avgTime.toFixed(2)}ms
        Min: ${minTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms`);

      // Tool execution should be reasonably fast
      expect(avgTime).toBeLessThan(1500); // Should complete in under 1.5 seconds on average
    });
  });

  describe('Memory Scaling Performance', () => {
    it('should handle large memory sets efficiently', async () => {
      // Test with different memory sizes
      const memorySizes = [10, 50, 100];
      const results: { size: number; time: number }[] = [];

      for (const size of memorySizes) {
        // Create fresh agent with specific memory size
        const memoryManager = new SlidingWindowMemoryManager(size);
        const testAgent = new Agent(memoryManager);

        // Populate with memories
        for (let i = 0; i < size; i++) {
          testAgent.remember(
            `Memory content ${i} with some longer text to simulate real usage`,
            'conversation',
            Math.random()
          );
        }

        const { avgTime } = await measurePerformance(
          async () => testAgent.getRelevantMemories('memory content simulation', 5),
          5
        );

        results.push({ size, time: avgTime });
      }

      console.log('Memory Scaling Results:');
      results.forEach(({ size, time }) => {
        console.log(`  ${size} memories: ${time.toFixed(2)}ms average`);
      });

      // Memory retrieval shouldn't degrade significantly with size
      const smallestTime = results[0].time;
      const largestTime = results[results.length - 1].time;
      const scalingFactor = largestTime / smallestTime;

      expect(scalingFactor).toBeLessThan(10); // Performance shouldn't degrade more than 10x
    });
  });

  describe('Concurrent Agent Performance', () => {
    it('should handle multiple concurrent agent runs', async () => {
      const concurrentRuns = 3;

      const { avgTime } = await measurePerformance(async () => {
        const promises = Array(concurrentRuns)
          .fill(null)
          .map((_, i) => agent.run(`Concurrent message ${i}`, mockAdapter));
        await Promise.all(promises);
      }, 2);

      console.log(
        `Concurrent Execution (${concurrentRuns} agents): ${avgTime.toFixed(2)}ms average`
      );

      // Concurrent execution should be reasonable
      expect(avgTime).toBeLessThan(3000); // Should complete in under 3 seconds
    });
  });
});
