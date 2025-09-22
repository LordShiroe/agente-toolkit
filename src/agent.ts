import { ModelAdapter } from './adapters/base';
import { MemoryManager, SlidingWindowMemoryManager, Memory } from './memory';
import { Planner } from './planner';
import { getLogger } from './logger';
import { Tool, Serializable } from './types/Tool';
import { RunOptions } from './types/RunOptions';
import { TSchema } from '@sinclair/typebox';

export class Agent {
  private memoryManager: MemoryManager;
  private tools: Tool<any, any>[] = [];
  private prompt: string = '';
  private planner = new Planner();
  private logger = getLogger();

  constructor(memoryManager?: MemoryManager) {
    this.memoryManager = memoryManager || new SlidingWindowMemoryManager();
  }

  addTool<TParams extends TSchema, TResult extends Serializable = string>(
    tool: Tool<TParams, TResult>
  ) {
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

  async run(message: string, model: ModelAdapter, options: RunOptions = {}): Promise<string> {
    this.logger.logRunStart({
      message: message.substring(0, 50) + '...',
      options,
    });
    this.remember(message, 'conversation', 0.8);
    const response = await this._executeDecisionCycle(message, model, options);
    this.remember(`Agent response: ${response}`, 'conversation', 0.6);
    this.logger.logRunEnd();
    return response;
  }

  private async _executeDecisionCycle(
    message: string,
    model: ModelAdapter,
    options: RunOptions
  ): Promise<string> {
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

      let result: string;

      // Try native execution first if adapter supports it
      if (model.supportsNativeTools) {
        try {
          this.logger.debug('Attempting native tool execution');

          // Build the full prompt with context
          const fullPrompt = this._buildPrompt(message, memoryContext);

          this.logger.logPrompt(fullPrompt, {
            userMessage: message,
            toolCount: this.tools.length,
            executionMode: 'native',
          });

          const executionResult = await model.executeWithTools(fullPrompt, this.tools);

          this.logger.logModelResponse(executionResult.content, {
            operation: 'native_execution',
            toolCallCount: executionResult.toolCalls.length,
            success: executionResult.success,
          });

          if (executionResult.success) {
            result = executionResult.content;
            this.logger.debug('Native execution successful');
          } else {
            throw new Error(`Native execution failed: ${executionResult.errors?.join(', ')}`);
          }
        } catch (nativeError) {
          this.logger.debug('Native execution failed, falling back to planner', {
            error: nativeError instanceof Error ? nativeError.message : String(nativeError),
          });

          // Fallback to planner execution
          result = await this.planner.execute(
            message,
            this.tools,
            memoryContext,
            this.prompt,
            model,
            options
          );
        }
      } else {
        // Use planner execution directly
        this.logger.debug('Using planner execution (adapter does not support native tools)');
        result = await this.planner.execute(
          message,
          this.tools,
          memoryContext,
          this.prompt,
          model,
          options
        );
      }

      // Log the overall execution result
      this.logger.debug('Agent execution completed', {
        executionType: model.supportsNativeTools ? 'native' : 'planned',
        resultLength: result.length,
      });

      // Remember the overall result
      this.remember(`Agent processed request. Result: ${result}`, 'tool_result', 0.6);

      return result;
    } catch (error) {
      const errorMessage = `Execution failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error('Agent execution failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return errorMessage;
    }
  }

  private _buildPrompt(message: string, memoryContext: string): string {
    let fullPrompt = '';

    if (this.prompt) {
      fullPrompt += `${this.prompt}\n\n`;
    }

    if (memoryContext && memoryContext !== 'No relevant context available.') {
      fullPrompt += `Relevant context:\n${memoryContext}\n\n`;
    }

    fullPrompt += `User request: ${message}`;

    return fullPrompt;
  }
}
