import { Tool } from '../../../core/tools/types/Tool';

/**
 * Result from tool execution (both native and planned)
 */
export interface ToolExecutionResult {
  /** Final response text */
  content: string;

  /** Tools that were called during execution */
  toolCalls: Array<{
    name: string;
    arguments: any;
    result: any;
  }>;

  /** Whether execution completed successfully */
  success: boolean;

  /** Any errors encountered */
  errors?: string[];
}

/**
 * Simplified ModelAdapter interface - clean breaking change approach
 * All adapters support both text completion and tool execution
 */
export interface ModelAdapter {
  /** Adapter name for identification */
  name: string;

  /** Whether this adapter supports native tool execution from the SDK */
  supportsNativeTools: boolean;

  /**
   * Text completion for general prompts and planning
   * options.json -> request generic JSON object
   * options.schema -> request JSON matching schema (provider support dependent)
   */
  complete(
    prompt: string,
    options?: { json?: boolean; schema?: Record<string, any> }
  ): Promise<string>;

  /**
   * Execute tools with a prompt - adapter chooses best method (native vs planned)
   * This is the main method for tool execution
   */
  executeWithTools(prompt: string, tools: Tool[]): Promise<ToolExecutionResult>;
}

/**
 * Base class for all model adapters
 */
export abstract class BaseAdapter implements ModelAdapter {
  abstract name: string;
  abstract supportsNativeTools: boolean;
  abstract complete(
    prompt: string,
    options?: { json?: boolean; schema?: Record<string, any> }
  ): Promise<string>;
  abstract executeWithTools(prompt: string, tools: Tool[]): Promise<ToolExecutionResult>;
}
