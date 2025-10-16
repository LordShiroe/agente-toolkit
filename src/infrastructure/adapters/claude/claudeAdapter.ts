import Anthropic from '@anthropic-ai/sdk';
import { TSchema, Static } from '@sinclair/typebox';
import { BaseAdapter, ToolExecutionResult } from '../base/base';
import { Tool } from '../../../core/tools/types/Tool';
import { SchemaUtils } from '../utils/schemaUtils';

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
  async complete(
    prompt: string,
    options?: { json?: boolean; schema?: Record<string, any> }
  ): Promise<string> {
    const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: prompt }];

    // Anthropic (as of mid-2025) does not have a stable json_schema response_format like OpenAI.
    // Strategy:
    // 1. If schema provided: prepend a system style instruction and ask for STRICT JSON matching schema.
    // 2. If json flag: ask for a single JSON object only.
    // We avoid over-constraining to reduce refusal likelihood.
    if (options?.schema) {
      messages.unshift({
        role: 'user',
        content:
          'You are a structured output generator. Return ONLY a JSON object strictly validating against this JSON Schema. Do not include markdown fences.' +
          `\nJSON Schema:\n${JSON.stringify(options.schema, null, 2)}\n` +
          'If a field is optional and you lack information, omit it. Never add explanatory text.',
      });
    } else if (options?.json) {
      // Detect if the prompt already demands a JSON array (e.g., Planner)
      const wantsArray = /json\s+array/i.test(prompt) || /\[[\s\S]*\{/.test(prompt);
      messages.unshift({
        role: 'user',
        content: wantsArray
          ? 'Return ONLY a valid JSON array (no markdown, no explanation).'
          : 'Return ONLY a valid JSON object (no markdown, no explanation). If you cannot comply, return an empty JSON object {}.',
      });
    }

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages,
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
        input_schema: SchemaUtils.convertToJsonSchema(tool.paramsSchema),
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
      let currentResponse = response;

      // Continue conversation while Claude wants to make tool calls
      let hasMoreToolCalls = this.hasToolCalls(currentResponse);

      while (hasMoreToolCalls) {
        await this.processToolCalls(currentResponse, tools, toolCalls, messages);

        // Get follow-up response
        currentResponse = await this.client.messages.create({
          model: this.model,
          max_tokens: 4096,
          messages,
          tools: anthropicTools,
          tool_choice: { type: 'auto' },
        });

        hasMoreToolCalls = this.hasToolCalls(currentResponse);
      }

      // Extract final text content (no more tool calls)
      finalContent = this.extractTextContent(currentResponse);

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
   * Check if a response contains tool calls
   */
  private hasToolCalls(response: Anthropic.Message): boolean {
    return response.content.some(block => block.type === 'tool_use');
  }

  /**
   * Extract text content from a response
   */
  private extractTextContent(response: Anthropic.Message): string {
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');
  }

  /**
   * Process all tool calls in a response
   */
  private async processToolCalls(
    response: Anthropic.Message,
    tools: Tool[],
    toolCalls: Array<{ name: string; arguments: any; result: any }>,
    messages: Anthropic.MessageParam[]
  ): Promise<void> {
    // Add assistant message with current response
    messages.push({
      role: 'assistant',
      content: response.content,
    });

    // Process each tool call
    for (const block of response.content) {
      if (block.type === 'tool_use') {
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

        // Add tool result to conversation
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
      }
    }
  }
}
