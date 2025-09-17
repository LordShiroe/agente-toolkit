import { Type } from '@sinclair/typebox';
import { Agent } from '../agent';
import { ModelAdapter } from '../adapters/base';
import { Tool } from '../types/Tool';
import { RunOptions } from '../types/RunOptions';

export const AgentToolParams = Type.Object({
  input: Type.String({ description: 'Input message to pass to the sub-agent' }),
});

export function createAgentTool(
  name: string,
  description: string,
  agent: Agent,
  adapter: ModelAdapter,
  options: RunOptions = {}
): Tool<typeof AgentToolParams, string> {
  return {
    name,
    description,
    paramsSchema: AgentToolParams,
    action: async params => {
      const result = await agent.run(params.input, adapter, options);
      return result;
    },
  };
}
