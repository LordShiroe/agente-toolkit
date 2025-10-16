import { TSchema, Static } from '@sinclair/typebox';
import { BaseAdapter, ToolExecutionResult } from '../base/base';
import { Tool } from '../../../core/tools/types/Tool';
import { SchemaUtils } from '../utils/schemaUtils';

// Define Ollama's tool format
interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

// Ollama's message format
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    function: {
      name: string;
      arguments: Record<string, any>;
    };
  }>;
}

// Ollama's response format
interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: 'assistant';
    content: string;
    tool_calls?: Array<{
      function: {
        name: string;
        arguments: Record<string, any>;
      };
    }>;
  };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Ollama adapter with native tool support
 * Uses Ollama's built-in function calling when available
 */
export class OllamaAdapter extends BaseAdapter {
  name = 'ollama';
  supportsNativeTools = true;

  private baseUrl: string;
  private model: string;

  constructor(baseUrl = 'http://localhost:11434', model = 'llama3.2:latest') {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.model = model;
  }

  /**
   * Text completion for general prompts
   */
  async complete(
    prompt: string,
    options?: { json?: boolean; schema?: Record<string, any> }
  ): Promise<string> {
    // Prefer native structured outputs via chat endpoint when requesting JSON
    if (options?.json || options?.schema) {
      const chatBody: any = {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      };
      if (options.schema) {
        chatBody.format = options.schema; // JSON schema object
      } else if (options.json) {
        chatBody.format = 'json';
      }
      const chatResponse = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatBody),
      });
      if (!chatResponse.ok) {
        throw new Error(`Ollama API error: ${chatResponse.status} ${chatResponse.statusText}`);
      }
      const data = (await chatResponse.json()) as {
        message?: { content?: string };
      };
      return data.message?.content || '';
    }

    // Fallback to simple generate for plain text
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { response?: string };
    return data.response || '';
  }

  /**
   * Execute tools with a prompt - uses native Ollama function calling
   */
  async executeWithTools(prompt: string, tools: Tool[]): Promise<ToolExecutionResult> {
    try {
      // Convert our Tool format to Ollama's format
      const ollamaTools: OllamaTool[] = tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: SchemaUtils.convertToJsonSchema(tool.paramsSchema),
        },
      }));

      const toolCalls: Array<{
        name: string;
        arguments: any;
        result: any;
      }> = [];

      // Make initial request with tools
      const messages: OllamaMessage[] = [{ role: 'user', content: prompt }];

      let response = await this.makeOllamaRequest(messages, ollamaTools);
      let finalContent = '';

      // Continue conversation while Ollama wants to make tool calls
      while (response.message.tool_calls && response.message.tool_calls.length > 0) {
        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: response.message.content,
          tool_calls: response.message.tool_calls,
        });

        // Process each tool call
        for (const toolCall of response.message.tool_calls) {
          // Find and execute the tool
          const tool = tools.find(t => t.name === toolCall.function.name);
          if (!tool) {
            throw new Error(`Tool ${toolCall.function.name} not found`);
          }

          const result = await tool.action(
            toolCall.function.arguments as Static<typeof tool.paramsSchema>
          );

          toolCalls.push({
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
            result,
          });

          // Add tool result to conversation
          messages.push({
            role: 'tool',
            content: JSON.stringify(result),
          });
        }

        // Get follow-up response
        response = await this.makeOllamaRequest(messages, ollamaTools);
      }

      // Extract final text content (no more tool calls)
      finalContent = response.message.content;

      return {
        content: finalContent,
        toolCalls,
        success: true,
      };
    } catch (error) {
      return {
        content: '',
        toolCalls: [],
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Make a request to Ollama's chat API
   */
  private async makeOllamaRequest(
    messages: OllamaMessage[],
    tools: OllamaTool[]
  ): Promise<OllamaResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as OllamaResponse;
  }
}
