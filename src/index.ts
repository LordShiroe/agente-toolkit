// Core Domain Exports
export { Agent } from './core/agent';
export { SlidingWindowMemoryManager } from './core/memory';

// Infrastructure Exports
export { ClaudeAdapter, OpenAIAdapter, OllamaAdapter } from './infrastructure/adapters';
export type { ModelAdapter, ToolExecutionResult } from './infrastructure/adapters';

// Enhanced planner with native tool support
export { Planner } from './core/execution';

// Injectable Logging System
export type { AgentLogger } from './infrastructure/logging';
export { ConsoleLogger, SilentLogger, createDefaultLogger } from './infrastructure/logging';

// Agent Registry and Management
export {
  registerAgent,
  getAgent,
  getAvailableAgents,
  findAgentsByCategory,
  findAgentsByKeywords,
  clearRegistry,
} from './core/agent';
export type { AgentMetadata, AgentCapability, AgentRegistration } from './core/agent';

// Optional: expose common tools and types for consumers
export type { Tool } from './core/tools';
export type { RunOptions } from './core/agent';
