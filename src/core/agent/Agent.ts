import { ModelAdapter } from '../../infrastructure/adapters/base/base';
import { MemoryManager, SlidingWindowMemoryManager, Memory } from '../memory/memory';
import { ExecutionEngine, ExecutionContext } from '../execution/ExecutionEngine';
import { AgentLogger } from '../../infrastructure/logging/interfaces/AgentLogger';
import { createDefaultLogger } from '../../infrastructure/logging/implementations/defaultLoggers';
import { LoggerUtils } from '../../infrastructure/logging/utils/loggerUtils';
import { Tool, Serializable } from '../tools/types/Tool';
import { RunOptions } from './types/RunOptions';
import { TSchema } from '@sinclair/typebox';
import { RetrievalConfig } from '../retrieval/types/RetrievalConfig';
import { SourceRegistry } from '../retrieval/SourceRegistry';

export class Agent {
  private memoryManager: MemoryManager;
  private tools: Tool<any, any>[] = [];
  private prompt: string = '';
  private executionEngine: ExecutionEngine;
  private logger: AgentLogger;
  private loggerUtils: LoggerUtils;
  private retrievalConfig?: RetrievalConfig;

  constructor(
    memoryManager?: MemoryManager,
    logger?: AgentLogger,
    sourceRegistry?: SourceRegistry
  ) {
    this.memoryManager = memoryManager || new SlidingWindowMemoryManager();
    this.logger = logger || createDefaultLogger();
    this.executionEngine = new ExecutionEngine(this.logger, sourceRegistry);
    this.loggerUtils = new LoggerUtils(this.logger);
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
    this.loggerUtils.logMemoryOperation('add', { type, importance, contentLength: message.length });
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

  setRetrievalConfig(config: RetrievalConfig) {
    this.retrievalConfig = config;
  }

  getRetrievalConfig(): RetrievalConfig | undefined {
    return this.retrievalConfig;
  }

  async run(message: string, model: ModelAdapter, options: RunOptions = {}): Promise<string> {
    this.loggerUtils.logRunStart({
      message: message.substring(0, 50) + '...',
      options,
    });
    this.remember(message, 'conversation', 0.8);
    const response = await this._executeDecisionCycle(message, model, options);
    this.remember(`Agent response: ${response}`, 'conversation', 0.6);
    this.loggerUtils.logRunEnd();
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

      // Create execution context
      const executionContext: ExecutionContext = {
        message,
        tools: this.tools,
        memoryContext,
        systemPrompt: this.prompt,
        model,
        options,
        retrieval: this.retrievalConfig,
      };

      // Delegate to execution engine
      const result = await this.executionEngine.execute(executionContext);

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
}
