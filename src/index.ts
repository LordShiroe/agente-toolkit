export { Agent } from './agent';
export { SlidingWindowMemoryManager } from './memory';
export { ClaudeAdapter } from './adapters/claudeAdapter';
export type { ModelAdapter, ToolExecutionResult } from './adapters/base';

// Enhanced planner with native tool support
export { Planner } from './planner';

// Agent Registry and Management
export {
  registerAgent,
  getAgent,
  getAvailableAgents,
  findAgentsByCategory,
  findAgentsByKeywords,
  clearRegistry,
} from './agentRegistry';
export type { AgentMetadata, AgentCapability, AgentRegistration } from './types/AgentMetadata';

// Optional: expose common tools and types for consumers
export type { Tool } from './types/Tool';
export type { RunOptions } from './types/RunOptions';
