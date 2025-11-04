import { RetrievalConfig } from '../../retrieval/types/RetrievalConfig';

export interface AgentMetadata {
  /**
   * Unique identifier for the agent
   */
  id: string;

  /**
   * Human-readable name for the agent
   */
  name: string;

  /**
   * Description of what the agent does
   */
  description: string;

  /**
   * Categories that this agent belongs to (e.g., "math", "weather", "search")
   */
  categories: string[];

  /**
   * Keywords that can help identify when this agent should be used
   */
  keywords: string[];

  /**
   * Priority level for this agent when multiple agents match a request
   * Higher numbers = higher priority
   */
  priority?: number;

  /**
   * Whether this agent is currently available for use
   */
  enabled?: boolean;

  /**
   * Additional metadata that specific implementations might need
   */
  custom?: Record<string, any>;
}

export interface AgentCapability {
  /**
   * What types of tasks this agent can handle
   */
  taskTypes: string[];

  /**
   * Examples of questions/requests this agent can handle
   */
  examples: string[];

  /**
   * Limitations or things this agent cannot do
   */
  limitations?: string[];
}

export interface AgentRegistration {
  metadata: AgentMetadata;
  capabilities: AgentCapability;

  /**
   * Optional retrieval configuration for RAG
   */
  retrieval?: RetrievalConfig;
}
