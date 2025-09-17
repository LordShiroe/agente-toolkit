import { Agent } from './agent';

const registry = new Map<string, Agent>();

export function registerAgent(name: string, agent: Agent) {
  registry.set(name, agent);
}

export function getAgent(name: string): Agent | undefined {
  return registry.get(name);
}

export function clearRegistry() {
  registry.clear();
}
