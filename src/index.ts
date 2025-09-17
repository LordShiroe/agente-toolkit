export { Agent } from './agent';
export { SlidingWindowMemoryManager } from './memory';
export { ClaudeAdapter } from './adapters/claudeAdapter';
export type { ModelAdapter } from './adapters/base';

// Optional: expose common tools and types for consumers
export type { Tool } from './types/Tool';
export type { RunOptions } from './types/RunOptions';
