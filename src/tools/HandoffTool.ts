import { Type } from '@sinclair/typebox';
import { Tool } from '../types/Tool';
import { getAgent } from '../agentRegistry';
import { ModelAdapter } from '../adapters/base';
import { RunOptions } from '../types/RunOptions';

export const HandoffParams = Type.Object({
  targetAgent: Type.String({ description: 'Name of the agent to hand off to (in registry)' }),
  input: Type.String({ description: 'Input to pass to the target agent' }),
});

export function createHandoffTool(
  adapter: ModelAdapter,
  defaultOptions: RunOptions = {}
): Tool<typeof HandoffParams, string> {
  return {
    name: 'handoff_to_agent',
    description: 'Hand off execution to a peer agent registered in the agent registry',
    paramsSchema: HandoffParams,
    action: async params => {
      const target = getAgent(params.targetAgent);
      if (!target) {
        throw new Error(`Target agent '${params.targetAgent}' not found`);
      }
      const result = await target.run(params.input, adapter, defaultOptions);
      return result;
    },
  };
}
