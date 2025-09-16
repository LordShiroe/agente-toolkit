import { ModelAdapter } from './adapters/base';
import { MemoryManager, SlidingWindowMemoryManager, Memory } from './memory';
import { Planner } from './planner';
import { getLogger } from './logger';
import Ajv from 'ajv';
import { TSchema } from '@sinclair/typebox';

export interface Tool<TParams = any> {
  name: string;
  description: string;
  paramsSchema: TSchema;
  action: (params: TParams) => Promise<string>;
}

export class Agent {
  private memoryManager: MemoryManager;
  private tools: Tool[] = [];
  private prompt: string = '';
  private ajv = new Ajv();
  private planner = new Planner();
  private logger = getLogger();

  constructor(memoryManager?: MemoryManager) {
    this.memoryManager = memoryManager || new SlidingWindowMemoryManager();
  }

  addTool<TParams>(tool: Tool<TParams>) {
    this.tools.push(tool);
  }

  remember(message: string, type: Memory['type'] = 'conversation', importance = 0.5): void {
    this.memoryManager.addMemory({
      type,
      content: message,
      importance,
    });
    this.logger.logMemoryOperation('add', { type, importance, contentLength: message.length });
  }

  getMemory(): Memory[] {
    return this.memoryManager.getAllMemories();
  }

  getMemoryCount(): number {
    return this.memoryManager.getMemoryCount();
  }

  getRelevantMemories(context: string, maxCount?: number): Memory[] {
    return this.memoryManager.getRelevantMemories(context, maxCount);
  }

  setPrompt(prompt: string) {
    this.prompt = prompt;
  }

  getPrompt(): string {
    return this.prompt;
  }

  async run(message: string, model: ModelAdapter): Promise<string> {
    this.logger.info('Starting agent execution', { message: message.substring(0, 50) + '...' });
    this.remember(message, 'conversation', 0.8);
    const response = await this._executeDecisionCycle(message, model);
    this.remember(`Agent response: ${response}`, 'conversation', 0.6);
    this.logger.info('Agent execution completed');
    return response;
  }

  private async _executeDecisionCycle(message: string, model: ModelAdapter): Promise<string> {
    try {
      const relevantMemories = this.memoryManager.getRelevantMemories(message, 5);
      const memoryContext =
        relevantMemories.length > 0
          ? relevantMemories.map(m => `[${m.type}] ${m.content}`).join('\n')
          : 'No relevant context available.';

      this.logger.debug('Retrieved relevant memories', {
        count: relevantMemories.length,
        contextLength: memoryContext.length,
      });

      const plan = await this.planner.createPlan(
        message,
        this.tools,
        memoryContext,
        this.prompt,
        model
      );

      this.logger.logPlanCreation(message, this.tools, plan);

      const result = await this.planner.executePlan(plan, this.tools);

      // Remember the execution steps
      plan.steps.forEach(step => {
        this.remember(`Executed ${step.toolName}: ${step.result}`, 'tool_result', 0.6);
      });

      return result;
    } catch (error) {
      const errorMessage = `Planning or execution failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error('Agent execution failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return errorMessage;
    }
  }
}
