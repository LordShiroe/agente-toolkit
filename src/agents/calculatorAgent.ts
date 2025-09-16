import { Agent, Tool } from '../agent';
import { ModelAdapter } from '../adapters/base';
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
    // Addition
    this.addTool({
      name: 'add',
      description: 'Add two numbers',
      paramsSchema: Type.Object({
        a: Type.Number({ description: 'First number' }),
        b: Type.Number({ description: 'Second number' }),
      }),
      resultSchema: Type.Number({ description: 'The sum of the two numbers' }),
      action: async ({ a, b }: { a: number; b: number }) => (a + b).toString(),
    });

    // Subtraction
    this.addTool({
      name: 'subtract',
      description: 'Subtract two numbers',
      paramsSchema: Type.Object({
        a: Type.Number({ description: 'First number' }),
        b: Type.Number({ description: 'Second number' }),
      }),
      resultSchema: Type.Number({ description: 'The difference of the two numbers' }),
      action: async ({ a, b }: { a: number; b: number }) => (a - b).toString(),
    });

    // Multiplication
    this.addTool({
      name: 'multiply',
      description: 'Multiply two numbers',
      paramsSchema: Type.Object({
        a: Type.Number({ description: 'First number' }),
        b: Type.Number({ description: 'Second number' }),
      }),
      resultSchema: Type.Number({ description: 'The product of the two numbers' }),
      action: async ({ a, b }: { a: number; b: number }) => (a * b).toString(),
    });

    // Division
    this.addTool({
      name: 'divide',
      description: 'Divide two numbers',
      paramsSchema: Type.Object({
        a: Type.Number({ description: 'Numerator' }),
        b: Type.Number({ description: 'Denominator' }),
      }),
      resultSchema: Type.Union([
        Type.Number({ description: 'The quotient of the two numbers' }),
        Type.String({ description: 'Error message if division by zero' }),
      ]),
      action: async ({ a, b }: { a: number; b: number }) => {
        if (b === 0) return 'Error: Division by zero';
        return (a / b).toString();
      },
    });
  }
}
