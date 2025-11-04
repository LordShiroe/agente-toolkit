import { ModelAdapter } from '../../infrastructure/adapters/base/base';
import { Planner } from './Planner';
import { ResponseProcessor } from './ResponseProcessor';
import { AgentLogger } from '../../infrastructure/logging/interfaces/AgentLogger';
import { createDefaultLogger } from '../../infrastructure/logging/implementations/defaultLoggers';
import { LoggerUtils } from '../../infrastructure/logging/utils/loggerUtils';
import { Tool } from '../tools/types/Tool';
import { RunOptions } from '../agent/types/RunOptions';
import { withExecutionMonitoring } from '../../infrastructure/monitoring/decorators/monitoring';
import {
  withFallbackMonitoring,
  withPlannedMonitoring,
} from '../../infrastructure/monitoring/decorators/fallbackMonitoring';
import { RetrievalConfig } from '../retrieval/types/RetrievalConfig';
import { RetrievalAugmentor } from '../retrieval/RetrievalAugmentor';
import { SourceRegistry } from '../retrieval/SourceRegistry';

/**
 * Context for execution requests
 */
export interface ExecutionContext {
  message: string;
  tools: Tool[];
  memoryContext: string;
  systemPrompt: string;
  model: ModelAdapter;
  options: RunOptions;
  retrieval?: RetrievalConfig;
}

/**
 * Handles execution decisions and orchestration between native and planned execution
 */
export class ExecutionEngine {
  private planner: Planner;
  private responseProcessor = new ResponseProcessor();
  private logger: AgentLogger;
  private loggerUtils: LoggerUtils;
  private retrievalAugmentor?: RetrievalAugmentor;

  // These properties will be set by the monitoring decorator
  private _currentExecutionId?: string;
  private _currentExecutionStartTime?: number;

  constructor(logger?: AgentLogger, sourceRegistry?: SourceRegistry) {
    this.logger = logger || createDefaultLogger();
    this.loggerUtils = new LoggerUtils(this.logger);
    this.planner = new Planner(this.logger);

    if (sourceRegistry) {
      this.retrievalAugmentor = new RetrievalAugmentor(sourceRegistry);
    }
  }

  /**
   * Execute a request using the most appropriate method (native or planned)
   */
  @withExecutionMonitoring
  async execute(context: ExecutionContext): Promise<string> {
    // Clean logic - decorators handle all monitoring
    if (context.model.supportsNativeTools) {
      try {
        return await this._tryNativeExecution(context);
      } catch (nativeError) {
        // Fallback to planner execution
        return await this._executePlanned(context);
      }
    } else {
      // Use planner execution directly
      return await this._executePlanned(context);
    }
  }

  /**
   * Attempt native tool execution
   */
  @withFallbackMonitoring
  private async _tryNativeExecution(context: ExecutionContext): Promise<string> {
    const { message, tools, memoryContext, systemPrompt, model, retrieval } = context;

    // Build the full prompt with context (and retrieval if configured)
    const fullPrompt = await this._buildPrompt(message, memoryContext, systemPrompt, retrieval);

    this.loggerUtils.logPrompt(fullPrompt, {
      userMessage: message,
      toolCount: tools.length,
      executionMode: 'native',
    });

    const executionResult = await model.executeWithTools(fullPrompt, tools);

    this.loggerUtils.logModelResponse(executionResult.content, {
      operation: 'native_execution',
      toolCallCount: executionResult.toolCalls.length,
      success: executionResult.success,
    });

    if (executionResult.success) {
      return executionResult.content;
    } else {
      throw new Error(`Native execution failed: ${executionResult.errors?.join(', ')}`);
    }
  }

  /**
   * Execute using planned approach with conversational post-processing
   */
  @withPlannedMonitoring
  private async _executePlanned(context: ExecutionContext): Promise<string> {
    const { message, tools, memoryContext, systemPrompt, model, options } = context;

    const rawResult = await this.planner.execute(
      message,
      tools,
      memoryContext,
      systemPrompt,
      model,
      options
    );

    // Convert planner output to conversational response
    return this.responseProcessor.generateConversationalResponse(
      message,
      rawResult,
      model,
      systemPrompt
    );
  }

  /**
   * Build full prompt with context and system prompt
   */
  private async _buildPrompt(
    message: string,
    memoryContext: string,
    systemPrompt: string,
    retrieval?: RetrievalConfig
  ): Promise<string> {
    let fullPrompt = '';

    // Apply retrieval augmentation if configured
    if (retrieval && this.retrievalAugmentor) {
      try {
        this.logger.debug('Applying retrieval augmentation', {
          sources: retrieval.sources,
          maxDocuments: retrieval.maxDocuments,
        });

        // Augment returns the full prompt with system, context, and user message
        fullPrompt = await this.retrievalAugmentor.augment(message, retrieval, systemPrompt);

        // Add memory context after retrieval context
        if (memoryContext && memoryContext !== 'No relevant context available.') {
          // Insert memory context before the user request
          const parts = fullPrompt.split('User request:');
          if (parts.length === 2) {
            fullPrompt = `${parts[0]}\nMemory context:\n${memoryContext}\n\nUser request:${parts[1]}`;
          }
        }

        return fullPrompt;
      } catch (error) {
        this.logger.error('Retrieval augmentation failed, falling back to basic prompt', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Fall through to basic prompt building
      }
    }

    // Basic prompt building (no retrieval)
    if (systemPrompt) {
      fullPrompt += `${systemPrompt}\n\n`;
    }

    if (memoryContext && memoryContext !== 'No relevant context available.') {
      fullPrompt += `Relevant context:\n${memoryContext}\n\n`;
    }

    fullPrompt += `User request: ${message}`;

    return fullPrompt;
  }
}
