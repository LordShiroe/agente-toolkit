import { ModelAdapter } from './adapters/base';
import { Planner } from './planner';
import { ResponseProcessor } from './responseProcessor';
import { getLogger } from './logger';
import { Tool } from './types/Tool';
import { RunOptions } from './types/RunOptions';
import { withExecutionMonitoring } from './decorators/monitoring';
import { withFallbackMonitoring, withPlannedMonitoring } from './decorators/fallbackMonitoring';

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
}

/**
 * Handles execution decisions and orchestration between native and planned execution
 */
export class ExecutionEngine {
  private planner = new Planner();
  private responseProcessor = new ResponseProcessor();
  private logger = getLogger();

  // These properties will be set by the monitoring decorator
  private _currentExecutionId?: string;
  private _currentExecutionStartTime?: number;

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
    const { message, tools, memoryContext, systemPrompt, model } = context;

    // Build the full prompt with context
    const fullPrompt = this._buildPrompt(message, memoryContext, systemPrompt);

    this.logger.logPrompt(fullPrompt, {
      userMessage: message,
      toolCount: tools.length,
      executionMode: 'native',
    });

    const executionResult = await model.executeWithTools(fullPrompt, tools);

    this.logger.logModelResponse(executionResult.content, {
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
  private _buildPrompt(message: string, memoryContext: string, systemPrompt: string): string {
    let fullPrompt = '';

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
