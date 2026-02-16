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
  tool_name?: string;
  tool_calls?: OllamaToolCall[];
}

interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, any>;
  };
}

// Ollama's response format
interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: 'assistant';
    content: string;
    tool_calls?: OllamaToolCall[];
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

  private readonly baseUrl: string;
  private readonly model: string;
  private readonly headers: Record<string, string>;

  constructor(
    baseUrl = 'http://localhost:11434',
    model = 'llama3.2:latest',
    options: OllamaAdapterOptions = {}
  ) {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.headers = this.buildHeaders(options);
  }

  private buildHeaders(options: OllamaAdapterOptions): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (options.authToken) {
      const name = options.authHeaderName ?? 'Authorization';
      const scheme = options.authScheme ?? 'Bearer ';
      headers[name] = `${scheme}${options.authToken}`;
    }

    return { ...headers, ...options.headers };
  }

  async complete(
    prompt: string,
    options?: { json?: boolean; schema?: Record<string, any> }
  ): Promise<string> {
    if (options?.json || options?.schema) {
      const body: Record<string, any> = {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: options.schema ?? (options.json ? 'json' : undefined),
      };

      const res = await this.postOllama('/api/chat', body);
      return (res as { message?: { content?: string } }).message?.content ?? '';
    }

    const res = await this.postOllama('/api/generate', {
      model: this.model,
      prompt,
      stream: false,
    });

    return (res as { response?: string }).response ?? '';
  }

  async executeWithTools(prompt: string, tools: Tool[]): Promise<ToolExecutionResult> {
    try {
      const ollamaTools = tools.map(tool => this.toOllamaTool(tool));
      const toolCalls: ToolExecutionResult['toolCalls'] = [];
      const messages: OllamaMessage[] = [{ role: 'user', content: prompt }];

      let response = await this.chatWithTools(messages, ollamaTools);
      let pendingToolCalls = this.getToolCalls(response);

      while (pendingToolCalls.length) {
        messages.push({
          role: 'assistant',
          content: response.message.content,
          tool_calls: pendingToolCalls,
        });

        for (const call of pendingToolCalls) {
          const tool = tools.find(t => t.name === call.function.name);
          if (!tool) throw new Error(`Tool "${call.function.name}" not found`);

          const result = await tool.action(
            call.function.arguments as Static<typeof tool.paramsSchema>
          );

          toolCalls.push({ name: call.function.name, arguments: call.function.arguments, result });
          messages.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_name: call.function.name,
          });
        }

        response = await this.chatWithTools(messages, ollamaTools);
        pendingToolCalls = this.getToolCalls(response);
      }

      return { content: response.message.content, toolCalls, success: true };
    } catch (error) {
      return {
        content: '',
        toolCalls: [],
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private toOllamaTool(tool: Tool): OllamaTool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: SchemaUtils.convertToJsonSchema(tool.paramsSchema),
      },
    };
  }

  private async chatWithTools(
    messages: OllamaMessage[],
    tools: OllamaTool[]
  ): Promise<OllamaResponse> {
    return this.postOllama('/api/chat', {
      model: this.model,
      messages,
      tools,
      stream: false,
    }) as Promise<OllamaResponse>;
  }

  private async postOllama(path: string, body: Record<string, any>): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await this.throwApiError(response);
    }

    return response.json();
  }

  private getToolCalls(response: OllamaResponse): OllamaToolCall[] {
    if (response.message.tool_calls?.length) {
      return response.message.tool_calls;
    }

    return this.extractToolCallsFromContent(response.message.content);
  }

  private extractToolCallsFromContent(content: string): OllamaToolCall[] {
    const parsed = this.tryParseToolCallJson(content);
    if (!parsed) return [];

    return this.toToolCallArray(parsed);
  }

  private tryParseToolCallJson(content: string): unknown {
    const trimmed = content.trim();
    if (!trimmed) return null;

    const candidates = [trimmed, this.stripMarkdownCodeFence(trimmed)].filter(Boolean) as string[];

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // keep trying candidates
      }
    }

    return null;
  }

  private stripMarkdownCodeFence(content: string): string {
    const match = content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return match?.[1]?.trim() ?? content;
  }

  private toToolCallArray(parsed: unknown): OllamaToolCall[] {
    if (!parsed || typeof parsed !== 'object') return [];

    if (Array.isArray(parsed)) {
      return parsed
        .map(item => this.normalizeToolCall(item))
        .filter((call): call is OllamaToolCall => call !== null);
    }

    const obj = parsed as Record<string, unknown>;

    if (Array.isArray(obj.tool_calls)) {
      return obj.tool_calls
        .map(item => this.normalizeToolCall(item))
        .filter((call): call is OllamaToolCall => call !== null);
    }

    const single = this.normalizeToolCall(obj);
    return single ? [single] : [];
  }

  private normalizeToolCall(raw: unknown): OllamaToolCall | null {
    if (!raw || typeof raw !== 'object') return null;

    const obj = raw as Record<string, unknown>;

    // Shape 1: { function: { name, arguments } }
    if (obj.function && typeof obj.function === 'object') {
      const fn = obj.function as Record<string, unknown>;
      const args = this.normalizeArguments(fn.arguments);
      if (typeof fn.name === 'string' && args) {
        return { function: { name: fn.name, arguments: args } };
      }
    }

    // Shape 2: { name, arguments }
    const args = this.normalizeArguments(obj.arguments);
    if (typeof obj.name === 'string' && args) {
      return { function: { name: obj.name, arguments: args } };
    }

    return null;
  }

  private normalizeArguments(raw: unknown): Record<string, any> | null {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, any>;
    }

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, any>;
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  private async throwApiError(response: Response): Promise<never> {
    let details = '';
    try {
      const raw = await response.text();
      if (raw.trim()) {
        try {
          const parsed = JSON.parse(raw) as { error?: string; message?: string };
          details = parsed.error ?? parsed.message ?? raw.trim();
        } catch {
          details = raw.trim();
        }
      }
    } catch {
      /* ignore body parsing errors */
    }

    throw new Error(
      `Ollama API error: ${response.status} ${response.statusText}${details ? `: ${details}` : ''}`
    );
  }
}

export interface OllamaAdapterOptions {
  /** Static headers to include in every Ollama request (e.g. reverse-proxy headers) */
  headers?: Record<string, string>;

  /** Token value used for proxy authentication */
  authToken?: string;

  /** Header name for proxy authentication. Defaults to Authorization */
  authHeaderName?: string;

  /**
   * Prefix prepended to authToken. Defaults to 'Bearer '.
   * Set to '' to send the token as-is.
   */
  authScheme?: string;
}
