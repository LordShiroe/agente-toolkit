import { Memory } from '../../src/core/memory/memory';

// Sample memory entries for testing
export const sampleMemories: Memory[] = [
  {
    id: 'mem-1',
    content: 'User asked about weather in Tokyo',
    type: 'conversation',
    importance: 0.8,
    timestamp: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'mem-2',
    content: 'Successfully calculated 25 * 4 = 100',
    type: 'tool_result',
    importance: 0.6,
    timestamp: new Date('2024-01-01T10:05:00Z'),
  },
  {
    id: 'mem-3',
    content: 'User prefers metric units for temperature',
    type: 'fact',
    importance: 0.9,
    timestamp: new Date('2024-01-01T09:30:00Z'),
  },
  {
    id: 'mem-4',
    content: 'System encountered API rate limit',
    type: 'system',
    importance: 0.7,
    timestamp: new Date('2024-01-01T10:02:00Z'),
  },
];

// Sample conversation history
export const sampleConversation = [
  { role: 'user', content: 'What is 15 + 27?' },
  { role: 'assistant', content: 'I can help you with that calculation. 15 + 27 = 42.' },
  { role: 'user', content: 'Now multiply that by 3' },
  { role: 'assistant', content: 'Multiplying the previous result (42) by 3 gives us 126.' },
];

// Sample tool definitions for testing
export const sampleTools = [
  {
    name: 'calculator',
    description: 'Performs basic arithmetic calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'memory_search',
    description: 'Search through previous conversations and memories',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for finding relevant memories',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return',
        },
      },
      required: ['query'],
    },
  },
];
