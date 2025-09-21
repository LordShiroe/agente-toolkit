import { Agent } from '../agent';
import { MemoryManager } from '../memory';
import { Type } from '@sinclair/typebox';
import { AgentRegistration } from '../types/AgentMetadata';

export class CalculatorAgent extends Agent {
  static readonly metadata: AgentRegistration = {
    metadata: {
      id: 'calculator',
      name: 'Calculator Agent',
      description: 'Performs arithmetic calculations and mathematical operations',
      categories: ['math', 'calculation', 'arithmetic'],
      keywords: [
        'calculate',
        'math',
        'add',
        'subtract',
        'multiply',
        'divide',
        'arithmetic',
        'numbers',
      ],
      priority: 5,
      enabled: true,
    },
    capabilities: {
      taskTypes: ['arithmetic', 'basic math', 'calculations'],
      examples: [
        'What is 15 + 27?',
        'Calculate 144 divided by 12',
        'Multiply 8 by 9',
        'What is 100 minus 25?',
      ],
      limitations: [
        'Cannot handle complex mathematical functions',
        'No support for advanced algebra or calculus',
      ],
    },
  };

  constructor(memoryManager?: MemoryManager) {
    super(memoryManager);
    this.setupCalculatorTools();
    this.setPrompt(
      `You are a helpful calculator assistant. When users ask for arithmetic operations, use the available tools to compute the result and provide a clear answer.`
    );
  }

  getMetadata(): AgentRegistration {
    return CalculatorAgent.metadata;
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
