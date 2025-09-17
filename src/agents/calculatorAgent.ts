import { Agent } from '../agent';
import { MemoryManager } from '../memory';
import { Type } from '@sinclair/typebox';

export class CalculatorAgent extends Agent {
  constructor(memoryManager?: MemoryManager) {
    super(memoryManager);
    this.setupCalculatorTools();
    this.setPrompt(
      `You are a helpful calculator assistant. When users ask for arithmetic operations, use the available tools to compute the result and provide a clear answer.`
    );
  }

  private setupCalculatorTools() {
    const twoNumberSchema = Type.Object({
      a: Type.Number({ description: 'First number' }),
      b: Type.Number({ description: 'Second number' }),
    });

    // Addition
    this.addTool({
      name: 'add',
      description: 'Add two numbers',
      paramsSchema: twoNumberSchema,
      action: async params => (params.a + params.b).toString(),
    });

    // Subtraction
    this.addTool({
      name: 'subtract',
      description: 'Subtract two numbers',
      paramsSchema: twoNumberSchema,
      action: async params => (params.a - params.b).toString(),
    });

    // Multiplication
    this.addTool({
      name: 'multiply',
      description: 'Multiply two numbers',
      paramsSchema: twoNumberSchema,
      action: async params => (params.a * params.b).toString(),
    });

    // Division
    this.addTool({
      name: 'divide',
      description: 'Divide two numbers',
      paramsSchema: Type.Object({
        a: Type.Number({ description: 'Numerator' }),
        b: Type.Number({ description: 'Denominator' }),
      }),
      action: async params => {
        if (params.b === 0) return 'Error: Division by zero';
        return (params.a / params.b).toString();
      },
    });
  }
}
