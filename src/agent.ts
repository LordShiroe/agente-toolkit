import { ModelAdapter } from './adapters/base';
import { MemoryManager, SlidingWindowMemoryManager, Memory } from './memory';
import Ajv from 'ajv';
import { TSchema } from '@sinclair/typebox';

export interface Tool<TParams = any> {
  name: string;
  description: string;
  paramsSchema: TSchema;
  action: (params: TParams) => Promise<string>;
}

export class Agent {
  private memoryManager: MemoryManager;
  private tools: Tool[] = [];
  private prompt: string = '';
  private ajv = new Ajv();

  constructor(memoryManager?: MemoryManager) {
    this.memoryManager = memoryManager || new SlidingWindowMemoryManager();
  }

  addTool<TParams>(tool: Tool<TParams>) {
    this.tools.push(tool);
  }

  remember(message: string, type: Memory['type'] = 'conversation', importance = 0.5): void {
    this.memoryManager.addMemory({
      type,
      content: message,
      importance,
    });
  }

  getMemory(): Memory[] {
    return this.memoryManager.getAllMemories();
  }

  getMemoryCount(): number {
    return this.memoryManager.getMemoryCount();
  }

  getRelevantMemories(context: string, maxCount?: number): Memory[] {
    return this.memoryManager.getRelevantMemories(context, maxCount);
  }

  setPrompt(prompt: string) {
    this.prompt = prompt;
  }

  getPrompt(): string {
    return this.prompt;
  }

  async run(message: string, model: ModelAdapter): Promise<string> {
    this.remember(message, 'conversation', 0.8);
    const response = await this._executeDecisionCycle(message, model);
    this.remember(`Agent response: ${response}`, 'conversation', 0.6);
    return response;
  }

  async decide(
    currentMessage: string,
    model: ModelAdapter
  ): Promise<Array<{ toolName: string; params: any }> | string> {
    // Get relevant memories for context instead of dumping all memories
    const relevantMemories = this.memoryManager.getRelevantMemories(currentMessage, 5);
    const memoryContext =
      relevantMemories.length > 0
        ? relevantMemories.map(m => `[${m.type}] ${m.content}`).join('\n')
        : 'No relevant context available.';

    // Format tool descriptions
    const toolDescriptions = this.tools
      .map(
        t =>
          `Tool: ${t.name}\nDescription: ${t.description}\nParams: ${JSON.stringify(
            t.paramsSchema
          )}`
      )
      .join('\n\n');

    const userMessage = `Context from memory:\n${memoryContext}\n\nAvailable Tools:\n${toolDescriptions}\n\nCurrent request: ${currentMessage}\n\nPlease respond with a JSON array of tool calls in the format: [{ "toolName": "name", "params": {...} }]`;
    const fullPrompt = `${this.prompt}\n\nHuman: ${userMessage}\n\nAssistant:`;
    const response = await model.complete(fullPrompt);

    console.log('LLM Response:', response);
    // Expecting response as a JSON array: [{ toolName: string, params: object }]
    let toolCalls: Array<{ toolName: string; params: any }> = [];
    try {
      toolCalls = JSON.parse(response);
      if (!Array.isArray(toolCalls)) throw new Error();
    } catch {
      return 'Failed to parse tool calls from LLM response. Expected a JSON array.';
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
    if (toolCalls.length === 0) {
      return 'No tools to execute.';
    }

    const results: string[] = [];
    for (const call of toolCalls) {
      const result = await this._runTool(call.toolName, call.params);
      results.push(`Tool: ${call.toolName}, Result: ${result}`);

      // Remember individual tool results for better context
      this.remember(
        `Used tool "${call.toolName}" with params ${JSON.stringify(call.params)}: ${result}`,
        'tool_result',
        0.6
      );
    }
    return results.join('\n');
  }

  private async _executeDecisionCycle(message: string, model: ModelAdapter): Promise<string> {
    const toolCalls = await this.decide(message, model);
    if (typeof toolCalls === 'string') {
      return toolCalls; // error message from decide
    }
    return await this.act(toolCalls);
  }
}
