import { Agent } from './agent';
import { AgentRegistration } from './types/AgentMetadata';

interface RegisteredAgent {
  agent: Agent;
  registration: AgentRegistration;
}

const registry = new Map<string, RegisteredAgent>();

export function registerAgent(name: string, agent: Agent, registration?: AgentRegistration) {
  const defaultRegistration: AgentRegistration = {
    metadata: {
      id: name,
      name: name,
      description: `Agent: ${name}`,
      categories: ['general'],
      keywords: [name],
      priority: 1,
      enabled: true,
    },
    capabilities: {
      taskTypes: ['general'],
      examples: [],
    },
  };

  registry.set(name, {
    agent,
    registration: registration || defaultRegistration,
  });
}

export function getAgent(name: string): Agent | undefined {
  return registry.get(name)?.agent;
}

export function getAgentRegistration(name: string): AgentRegistration | undefined {
  return registry.get(name)?.registration;
}

export function getAllAgents(): Map<string, RegisteredAgent> {
  return new Map(registry);
}

export function findAgentsByCategory(
  category: string
): Array<{ name: string; agent: Agent; registration: AgentRegistration }> {
  const results: Array<{ name: string; agent: Agent; registration: AgentRegistration }> = [];

  for (const [name, registered] of registry.entries()) {
    if (
      registered.registration.metadata.categories.includes(category) &&
      registered.registration.metadata.enabled !== false
    ) {
      results.push({ name, agent: registered.agent, registration: registered.registration });
    }
  }

  // Sort by priority (higher priority first)
  return results.sort(
    (a, b) => (b.registration.metadata.priority || 0) - (a.registration.metadata.priority || 0)
  );
}

export function findAgentsByKeywords(
  keywords: string[]
): Array<{ name: string; agent: Agent; registration: AgentRegistration }> {
  const results: Array<{ name: string; agent: Agent; registration: AgentRegistration }> = [];

  for (const [name, registered] of registry.entries()) {
    if (registered.registration.metadata.enabled === false) continue;

    const agentKeywords = registered.registration.metadata.keywords.map(k => k.toLowerCase());
    const hasMatchingKeyword = keywords.some(keyword =>
      agentKeywords.some(
        agentKeyword =>
          agentKeyword.includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(agentKeyword)
      )
    );

    if (hasMatchingKeyword) {
      results.push({ name, agent: registered.agent, registration: registered.registration });
    }
  }

  // Sort by priority (higher priority first)
  return results.sort(
    (a, b) => (b.registration.metadata.priority || 0) - (a.registration.metadata.priority || 0)
  );
}

export function getAvailableAgents(): Array<{
  name: string;
  agent: Agent;
  registration: AgentRegistration;
}> {
  const results: Array<{ name: string; agent: Agent; registration: AgentRegistration }> = [];

  for (const [name, registered] of registry.entries()) {
    if (registered.registration.metadata.enabled !== false) {
      results.push({ name, agent: registered.agent, registration: registered.registration });
    }
  }

  return results.sort(
    (a, b) => (b.registration.metadata.priority || 0) - (a.registration.metadata.priority || 0)
  );
}

export function clearRegistry() {
  registry.clear();
}
