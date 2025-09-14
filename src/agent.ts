import { ModelAdapter } from './adapters/base';
import Ajv from 'ajv';
import { TSchema } from '@sinclair/typebox';

export interface Tool<TParams = any> {
  name: string;
  description: string;
  paramsSchema: TSchema;
  action: (params: TParams) => Promise<string>;
}

export class Agent {
  private memory: string[] = [];
  private tools: Tool[] = [];
  private prompt: string = '';
  private ajv = new Ajv();

  addTool<TParams>(tool: Tool<TParams>) {
    this.tools.push(tool);
  }

  remember(message: string) {
    this.memory.push(message);
  }

  getMemory(): string[] {
    return [...this.memory];
  }

  setPrompt(prompt: string) {
    this.prompt = prompt;
  }

  getPrompt(): string {
    return this.prompt;
  }

  async act(toolName: string, params: any): Promise<string> {
    const tool = this.tools.find(t => t.name === toolName);
    if (tool) {
      // Validate params against tool.paramsSchema using ajv
      const validate = this.ajv.compile(tool.paramsSchema);
      const valid = validate(params);
      if (!valid) {
        return `Invalid parameters for tool '${toolName}': ${this.ajv.errorsText(validate.errors)}`;
      }
      const result = await tool.action(params);
      this.remember(`Tool '${tool.name}' used with params: ${JSON.stringify(params)}`);
      this.remember(`Result: ${result}`);
      return result;
    }
    return `Tool '${toolName}' not found.`;
  }

  async decideAndAct(apiKey: string, model: ModelAdapter, modelOverride?: string): Promise<string> {
    // Format prompt for Claude with memory and tool descriptions
    const toolDescriptions = this.tools
      .map(
        t =>
          `Tool: ${t.name}\nDescription: ${t.description}\nParams: ${JSON.stringify(
            t.paramsSchema
          )}`
      )
      .join('\n\n');
    const userMessage = `Memory:\n${this.memory.join(
      '\n'
    )}\n\nAvailable Tools:\n${toolDescriptions}\n\nPlease respond with a JSON array of tool calls in the format: [{ "toolName": "name", "params": {...} }]`;
    const fullPrompt = `${this.prompt}\n\nHuman: ${userMessage}\n\nAssistant:`;
    const response = await model.complete(fullPrompt, { apiKey, model: modelOverride });

    console.log('Claude Response:', response);
    // Expecting response as a JSON array: [{ toolName: string, params: object }]
    let toolCalls: Array<{ toolName: string; params: any }> = [];
    try {
      toolCalls = JSON.parse(response);
      if (!Array.isArray(toolCalls)) throw new Error();
    } catch {
      return 'Failed to parse tool calls from Claude response. Expected a JSON array.';
    }
    const results: string[] = [];
    for (const call of toolCalls) {
      const result = await this.act(call.toolName, call.params);
      results.push(`Tool: ${call.toolName}, Result: ${result}`);
    }
    return results.join('\n');
  }
}
