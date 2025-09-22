import { ModelAdapter } from './adapters/base';
import { Planner } from './planner';
import { ResponseProcessor } from './responseProcessor';
import { getLogger } from './logger';
import { Tool } from './types/Tool';
import { RunOptions } from './types/RunOptions';

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

  /**
   * Execute a request using the most appropriate method (native or planned)
   */
  async execute(context: ExecutionContext): Promise<string> {
    const { message, tools, memoryContext, systemPrompt, model, options } = context;

    // Try native execution first if adapter supports it
    if (model.supportsNativeTools) {
      try {
        this.logger.debug('Attempting native tool execution');

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
          this.logger.debug('Native execution successful');
          return executionResult.content;
        } else {
          throw new Error(`Native execution failed: ${executionResult.errors?.join(', ')}`);
        }
      } catch (nativeError) {
        this.logger.debug('Native execution failed, falling back to planner', {
          error: nativeError instanceof Error ? nativeError.message : String(nativeError),
        });

        // Fallback to planner execution
        return this._executePlanned(context);
      }
    } else {
      // Use planner execution directly
      this.logger.debug('Using planner execution (adapter does not support native tools)');
      return this._executePlanned(context);
    }
  }

  /**
   * Execute using planned approach with conversational post-processing
   */
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
