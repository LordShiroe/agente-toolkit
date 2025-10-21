# API Overview

A concise reference to the main public APIs. See source for full typings.

## Agent

```ts
constructor(memoryManager?: MemoryManager, logger?: AgentLogger)
addTool(tool: Tool): void
remember(message: string, type?: Memory['type'], importance?: number): void
getMemory(): Memory[]
getMemoryCount(): number
getRelevantMemories(context: string, maxCount?: number): Memory[]
setPrompt(prompt: string): void
getPrompt(): string
run(message: string, model: ModelAdapter, options?: RunOptions): Promise<string>
```

### RunOptions (selected)

- maxSteps?: number
- maxDurationMs?: number
- stopOnFirstToolError?: boolean

## ManagerAgent

```ts
constructor(adapter: ModelAdapter, memoryManager?: MemoryManager, options?: ManagerAgentOptions)
static withAgents(adapter: ModelAdapter, agents: Array<{ name: string; agent: Agent; registration?: AgentRegistration }>, memoryManager?: MemoryManager, options?: ManagerAgentOptions): ManagerAgent
```

### ManagerAgentOptions (selected)

- allowedCategories?: string[]
- maxAgents?: number
- customPrompt?: string
- includeDetailedCapabilities?: boolean

## Memory

```ts
class SlidingWindowMemoryManager implements MemoryManager {
  constructor(maxMemories = 50, maxTokensPerMemory = 200);
}
```

Memory types: `'conversation' | 'fact' | 'tool_result' | 'system'`

## Adapters

```ts
new ClaudeAdapter(apiKey?: string, model?: string)
new OpenAIAdapter(apiKey?: string, model?: string)
new OllamaAdapter(baseUrl?: string, model?: string)
```

All adapters implement:

```ts
interface ModelAdapter {
  name: string;
  supportsNativeTools: boolean;
  complete(
    prompt: string,
    options?: { json?: boolean; schema?: Record<string, any> }
  ): Promise<string>;
  executeWithTools(prompt: string, tools: Tool[]): Promise<ToolExecutionResult>;
}
```

## Tools

```ts
interface Tool<TParams extends TSchema = TSchema, TResult extends Serializable = string> {
  name: string;
  description: string;
  paramsSchema: TParams;
  action: (params: Static<TParams>) => Promise<TResult>;
}
```

## Registry

```ts
registerAgent(name: string, agent: Agent, registration?: AgentRegistration): void
getAvailableAgents(): Array<{ name: string; agent: Agent; registration: AgentRegistration }>
findAgentsByCategory(category: string): Array<{ name: string; registration: AgentRegistration }>
```

---

For detailed type information, check the source under `src/`.
