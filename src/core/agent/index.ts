// Core Agent Domain - Public Interface
export { Agent } from './Agent';
export {
  registerAgent,
  getAgent,
  getAvailableAgents,
  findAgentsByCategory,
  findAgentsByKeywords,
  clearRegistry,
} from './AgentRegistry';

// Agent types
export type { AgentMetadata, AgentCapability, AgentRegistration } from './types/AgentMetadata';
export type { RunOptions } from './types/RunOptions';
