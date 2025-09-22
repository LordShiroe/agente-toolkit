import Anthropic from '@anthropic-ai/sdk';
import { TSchema, Static } from '@sinclair/typebox';
import { BaseAdapter, ToolExecutionResult } from './base';
import { Tool } from '../types/Tool';

// Define Anthropic's tool format
interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Claude adapter with native tool support
 * Uses Anthropic's built-in tool calling when available, falls back to planning mode
 */
export class ClaudeAdapter extends BaseAdapter {
  name = 'claude';
  supportsNativeTools = true;

  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string, model = 'claude-sonnet-4-20250514') {
    super();
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = model;
  }

  /**
   * Text completion for general prompts
   */
  async complete(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlocks = message.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    return textBlocks.map(block => block.text).join('\n');
  }

  /**
   * Execute tools with a prompt - uses native Anthropic tool calling
   */
  async executeWithTools(prompt: string, tools: Tool[]): Promise<ToolExecutionResult> {
    try {
      // Convert our Tool format to Anthropic's format
      const anthropicTools: AnthropicTool[] = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: this.convertSchemaToJsonSchema(tool.paramsSchema),
      }));

      const toolCalls: Array<{
        name: string;
        arguments: any;
        result: any;
      }> = [];

      // Make initial request with tools
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
        tools: anthropicTools,
        tool_choice: { type: 'auto' },
      });

      let finalContent = '';
      const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }];

      // Process tool calls
      for (const block of response.content) {
        if (block.type === 'text') {
          finalContent += block.text;
        } else if (block.type === 'tool_use') {
          // Find and execute the tool
          const tool = tools.find(t => t.name === block.name);
          if (!tool) {
            throw new Error(`Tool ${block.name} not found`);
          }

          const result = await tool.action(block.input as Static<typeof tool.paramsSchema>);

          toolCalls.push({
            name: block.name,
            arguments: block.input,
            result,
          });

          // Continue conversation with tool result
          messages.push({
            role: 'assistant',
            content: response.content,
          });

          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              },
            ],
          });

          // Get follow-up response
          const followUp = await this.client.messages.create({
            model: this.model,
            max_tokens: 4096,
            messages,
            tools: anthropicTools,
            tool_choice: { type: 'auto' },
          });

          // Add follow-up text
          const followUpText = followUp.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map(block => block.text)
            .join('\n');

          if (followUpText) {
            finalContent += '\n' + followUpText;
          }
        }
      }

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
   * Convert TypeBox schema to JSON Schema format for Anthropic
   */
  private convertSchemaToJsonSchema(schema: TSchema): any {
    const schemaObj = schema as any;

    if (schemaObj.type === 'object') {
      return {
        type: 'object',
        properties: schemaObj.properties || {},
        required: schemaObj.required || [],
      };
    }

    // For non-object schemas, wrap in an object
    return {
      type: 'object',
      properties: {
        value: schemaObj,
      },
      required: ['value'],
    };
  }
}
