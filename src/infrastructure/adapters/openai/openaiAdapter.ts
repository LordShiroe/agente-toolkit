import OpenAI from 'openai';
import { TSchema, Static } from '@sinclair/typebox';
import { BaseAdapter, ToolExecutionResult } from '../base/base';
import { Tool } from '../../../core/tools/types/Tool';
import { SchemaUtils } from '../utils/schemaUtils';

// Define OpenAI's tool format
interface OpenAITool {
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

/**
 * OpenAI adapter with native tool support
 * Uses OpenAI's built-in function calling when available
 */
export class OpenAIAdapter extends BaseAdapter {
  name = 'openai';
  supportsNativeTools = true;

  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model = 'gpt-4o') {
    super();
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = model;
  }

  /**
   * Text completion for general prompts
   */
  async complete(prompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    });

    return completion.choices[0]?.message?.content || '';
  }

  /**
   * Execute tools with a prompt - uses native OpenAI function calling
   */
  async executeWithTools(prompt: string, tools: Tool[]): Promise<ToolExecutionResult> {
    try {
      // Convert our Tool format to OpenAI's format
      const openaiTools: OpenAITool[] = tools.map(tool => ({
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
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'user', content: prompt },
      ];

      let response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: openaiTools,
        tool_choice: 'auto',
        max_tokens: 4096,
      });

      let finalContent = '';
      let currentChoice = response.choices[0];

      // Continue conversation while OpenAI wants to make tool calls
      while (currentChoice?.message?.tool_calls && currentChoice.message.tool_calls.length > 0) {
        // Add assistant message with tool calls
        messages.push(currentChoice.message);

        // Process each tool call
        for (const toolCall of currentChoice.message.tool_calls) {
          if (toolCall.type === 'function') {
            // Find and execute the tool
            const tool = tools.find(t => t.name === toolCall.function.name);
            if (!tool) {
              throw new Error(`Tool ${toolCall.function.name} not found`);
            }

            let toolArgs: any;
            try {
              toolArgs = JSON.parse(toolCall.function.arguments);
            } catch (error) {
              throw new Error(`Invalid JSON in tool arguments: ${toolCall.function.arguments}`);
            }

            const result = await tool.action(toolArgs as Static<typeof tool.paramsSchema>);

            toolCalls.push({
              name: toolCall.function.name,
              arguments: toolArgs,
              result,
            });

            // Add tool result to conversation
            messages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
            });
          }
        }

        // Get follow-up response
        response = await this.client.chat.completions.create({
          model: this.model,
          messages,
          tools: openaiTools,
          tool_choice: 'auto',
          max_tokens: 4096,
        });

        currentChoice = response.choices[0];
      }

      // Extract final text content (no more tool calls)
      finalContent = currentChoice?.message?.content || '';

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
}
