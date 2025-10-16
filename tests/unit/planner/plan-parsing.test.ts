import { describe, it, expect } from 'vitest';
import { Planner } from '../../../src/core/execution/Planner';
import { Tool } from '../../../src/core/tools/types/Tool';
import { Type } from '@sinclair/typebox';
import { ModelAdapter, ToolExecutionResult } from '../../../src/infrastructure/adapters/base/base';

class FakeAdapter implements ModelAdapter {
  name = 'fake';
  supportsNativeTools = false;
  private response: string;

  constructor(response: string) {
    this.response = response;
  }

  async complete(): Promise<string> {
    return this.response;
  }

  async executeWithTools(): Promise<ToolExecutionResult> {
    throw new Error('not implemented');
  }
}

describe('Planner plan parsing', () => {
  const MultiplySchema = Type.Object({ a: Type.Number(), b: Type.Number() });
  const tools: Tool[] = [
    {
      name: 'multiply',
      description: 'Multiply two numbers',
      paramsSchema: MultiplySchema,
      action: async ({ a, b }: any) => String(a * b),
    },
  ];

  it('accepts a single step object', async () => {
    const singleStep = JSON.stringify({
      id: 'step1',
      toolName: 'multiply',
      params: { a: 2, b: 3 },
      dependsOn: [],
    });

    const planner = new Planner();
    const adapter = new FakeAdapter(singleStep);

    const plan = await planner.createPlan(
      'two times three',
      tools,
      '',
      'You are a planner.',
      adapter
    );

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toMatchObject({ id: 'step1', toolName: 'multiply', status: 'pending' });
  });

  it('accepts an object with steps array', async () => {
    const wrapped = JSON.stringify({
      steps: [{ id: 's1', toolName: 'multiply', params: { a: 4, b: 5 }, dependsOn: [] }],
    });
    const planner = new Planner();
    const adapter = new FakeAdapter(wrapped);
    const plan = await planner.createPlan('four times five', tools, '', 'Planner', adapter);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].id).toBe('s1');
  });
});
