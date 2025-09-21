# Agente Toolkit

A minimal TypeScript library for building AI agents with orchestration patterns (single-agent loops, manager agents, and decentralized handoffs). Features an **intelligent generic ManagerAgent** that dynamically discovers and routes to specialized agents using keywords and capabilities.

## Features

- **Single-agent planning/execution** with memory and tools
- **Intelligent Manager pattern** via enhanced `ManagerAgent` with dynamic agent discovery
- **Smart routing** using agent keywords, capabilities, and examples for better delegation
- **Decentralized handoffs** via a registry and `handoff_to_agent` tool
- **Agent metadata system** for rich agent descriptions and intelligent routing
- **Safety guardrails**: max steps, max duration, stop-on-first-error
- **Structured logging** with step-level timings

## Key Enhancement: Generic ManagerAgent

The `ManagerAgent` now intelligently manages any registered agents without hardcoding:

- **Dynamic Discovery**: Automatically finds and creates tools for all registered agents
- **Keyword-based Routing**: Uses agent keywords to match user requests to appropriate agents
- **Capability Awareness**: Leverages task types, examples, and limitations for smart delegation
- **Rich Context**: Generates detailed prompts with agent capabilities and routing guidelines

### Quick Example

```typescript
import { ManagerAgent, CalculatorAgent, WeatherAgent, registerAgent } from 'ai-noob';

// Register agents with their metadata
registerAgent('calculator', new CalculatorAgent(), CalculatorAgent.metadata);
registerAgent('weather', new WeatherAgent(), WeatherAgent.metadata);

// Create intelligent manager that routes based on keywords and capabilities
const manager = new ManagerAgent(adapter);
// Now handles: "Calculate 15+27" → Calculator, "Weather in NYC" → Weather
```

## Install

Clone and install deps:

```bash
npm install
npm run build
```

## CLI Quickstart

Start the chat and select an agent from the menu. Supply your Anthropic API key.

Flags:

- `--mode single|manager|decentralized` (default: `single`)
- `--max-steps <n>` safety ceiling for steps
- `--timeout-ms <ms>` safety ceiling for duration
- `--stop-on-error` stop on first tool failure
- `--model <name>` override Claude model

Examples:

Single agent (Calculator or Weather):

```bash
npm run build
node dist/cli.js chat -k $ANTHROPIC_API_KEY --mode single --max-steps 8 --timeout-ms 20000
```

Manager agent (intelligently delegates to Calculator/Weather using keywords and capabilities):

```bash
npm run build
node dist/cli.js chat -k $ANTHROPIC_API_KEY --mode manager --max-steps 12
```

Decentralized (router + handoffs to peers):

```bash
npm run build
node dist/cli.js chat -k $ANTHROPIC_API_KEY --mode decentralized --timeout-ms 30000
```

## Programmatic Usage

### Basic Agent

```ts
import { Agent, ClaudeAdapter } from 'ai-noob';

const agent = new Agent();
agent.setPrompt('You are a helpful assistant.');
// agent.addTool(...)

const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY!);
const result = await agent.run('Hello!', adapter, { maxSteps: 8, stopOnFirstToolError: true });
console.log(result);
```

### Intelligent Manager Agent

```ts
import { ManagerAgent, CalculatorAgent, WeatherAgent, registerAgent } from 'ai-noob';

// Register agents with rich metadata
const calc = new CalculatorAgent();
const weather = new WeatherAgent();

registerAgent('calculator', calc, CalculatorAgent.metadata);
registerAgent('weather', weather, WeatherAgent.metadata);

// Create manager that intelligently routes based on keywords and capabilities
const manager = new ManagerAgent(adapter);

// The manager now understands:
// "Calculate 15 + 27" → Routes to Calculator (matches keywords: calculate, math, add)
// "Weather in Tokyo" → Routes to Weather (matches keywords: weather, temperature)
// "What's 50 divided by 2?" → Routes to Calculator (matches task type: arithmetic)

const result = await manager.run('What is 25 * 4?', adapter);
```

### Custom Agent with Metadata

```ts
import { Agent, AgentRegistration } from 'ai-noob';

class CustomAgent extends Agent {
  static readonly metadata: AgentRegistration = {
    metadata: {
      id: 'custom',
      name: 'Custom Agent',
      description: 'Handles custom tasks',
      categories: ['utility', 'custom'],
      keywords: ['custom', 'utility', 'helper', 'process'],
      priority: 3,
    },
    capabilities: {
      taskTypes: ['data processing', 'utility functions'],
      examples: ['Process this data', 'Help with utility task'],
      limitations: ['Cannot handle real-time data'],
    },
  };

  constructor() {
    super();
    // Add custom tools...
  }
}

// Register and use with ManagerAgent
registerAgent('custom', new CustomAgent(), CustomAgent.metadata);
const manager = new ManagerAgent(adapter); // Automatically includes custom agent
```

## Notes

- The **ManagerAgent** now intelligently routes requests using agent keywords, capabilities, and examples
- **Agent metadata** enables dynamic discovery and smart delegation without hardcoding agent knowledge
- **Weather functions** call public APIs; ensure you have network access when using them
- **Decentralized mode** demonstrates peer-to-peer agent handoffs via registry
- **Logging** is verbose in `--verbose` mode and includes prompts/responses in detail
