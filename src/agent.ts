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

  async run(message: string, model: ModelAdapter): Promise<string> {
    this.remember(message);
    const toolCalls = await this.decide(model);
    if (typeof toolCalls === 'string') {
      return toolCalls; // error message from decide
    }
    return await this.act(toolCalls);
  }

  async decide(model: ModelAdapter): Promise<Array<{ toolName: string; params: any }> | string> {
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
    const response = await model.complete(fullPrompt);

    console.log('Claude Response:', response);
    // Expecting response as a JSON array: [{ toolName: string, params: object }]
    let toolCalls: Array<{ toolName: string; params: any }> = [];
    try {
      toolCalls = JSON.parse(response);
      if (!Array.isArray(toolCalls)) throw new Error();
    } catch {
      return 'Failed to parse tool calls from Claude response. Expected a JSON array.';
    }
    return toolCalls;
  }

  private async _runTool(toolName: string, params: any): Promise<string> {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      return `Tool '${toolName}' not found.`;
    }
    // Validate params
    const validate = this.ajv.compile(tool.paramsSchema);
    if (!validate(params)) {
      return `Invalid params for tool '${toolName}': ${JSON.stringify(validate.errors)}`;
    }
    return await tool.action(params);
  }

  async act(toolCalls: Array<{ toolName: string; params: any }>): Promise<string> {
    const results: string[] = [];
    for (const call of toolCalls) {
      const result = await this._runTool(call.toolName, call.params);
      results.push(`Tool: ${call.toolName}, Result: ${result}`);
    }
    return results.join('\n');
  }

  async decideAndAct(model: ModelAdapter): Promise<string> {
    const toolCalls = await this.decide(model);
    if (typeof toolCalls === 'string') {
      return toolCalls; // error message from decide
    }
    return await this.act(toolCalls);
  }
}
