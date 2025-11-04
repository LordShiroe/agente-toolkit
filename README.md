# agente-toolkit

[![npm version](https://badge.fury.io/js/agente-toolkit.svg)](https://www.npmjs.com/package/agente-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A modern TypeScript library for building AI agents with **native tool calling** and intelligent orchestration patterns. Features both single-agent execution and intelligent manager agents that automatically discover and route to specialized agents.

## 🚀 Key Features

### **Native Tool Calling Support**

- **Claude Native Integration**: Leverages Anthropic's built-in tool calling for optimal performance
- **Automatic Fallback**: Gracefully falls back to traditional planning when native tools aren't available
- **Adapter-Driven**: Clean abstraction that works with multiple LLM providers

### **Intelligent Agent Architecture**

- **Single-agent execution** with memory, tools, and conversational responses
- **Intelligent Manager pattern** via enhanced `ManagerAgent` with dynamic agent discovery
- **Smart routing** using agent keywords, capabilities, and examples for better delegation
- **Clean Architecture**: Separated concerns with ExecutionEngine, ResponseProcessor, and Planner

### **Advanced Capabilities**

- **Conversational Responses**: Automatic post-processing converts raw tool results into natural language
- **Memory Management**: Context-aware memory with relevance scoring
- **Retrieval-Augmented Generation (RAG)**: Optional pluggable retrieval system to ground responses in external knowledge
- **Safety Guardrails**: Max steps, max duration, stop-on-first-error
- **Comprehensive Logging**: Detailed execution tracking with step-level timings

## 🏗️ Architecture Overview

```
Agent (Coordinator)
├── ExecutionEngine (Execution Orchestration)
│   ├── Native tool calling (when supported)
│   ├── Fallback to planned execution
│   └── ResponseProcessor (Conversational formatting)
└── Planner (Traditional step-by-step execution)
    ├── Plan creation and validation
    └── Tool coordination and execution
```

## 🎯 Enhanced ManagerAgent

The `ManagerAgent` intelligently manages any registered agents with automatic discovery:

- **Dynamic Discovery**: Automatically finds and creates tools for all registered agents
- **Keyword-based Routing**: Uses agent keywords to match user requests to appropriate agents
- **Capability Awareness**: Leverages task types, examples, and limitations for smart delegation
- **Native Tool Integration**: Benefits from both native tool calling and conversational responses

### Quick Example

```typescript
import { ManagerAgent, registerAgent, ClaudeAdapter } from 'agente-toolkit';

// For this example, you'll need to copy the example agents from the GitHub repository
// See: https://github.com/LordShiroe/agente-toolkit/tree/main/examples/agents
// import { CalculatorAgent, WeatherAgent } from './your-agents-directory';

// For demonstration, let's create simple agents inline
class CalculatorAgent extends Agent {
  constructor() {
    super();
    this.addTool({
      name: 'add',
      description: 'Add two numbers',
      paramsSchema: Type.Object({
        a: Type.Number(),
        b: Type.Number(),
      }),
      action: async params => (params.a + params.b).toString(),
    });
  }

  static metadata = {
    metadata: {
      id: 'calculator',
      name: 'Calculator Agent',
      description: 'Performs arithmetic calculations',
      categories: ['math'],
      keywords: ['calculate', 'math', 'add'],
      priority: 5,
    },
    capabilities: {
      taskTypes: ['arithmetic'],
      examples: ['What is 15 + 27?'],
      limitations: [],
    },
  };
}

// Register agents with their metadata
registerAgent('calculator', new CalculatorAgent(), CalculatorAgent.metadata);

// Create adapter with native tool support
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

// Create intelligent manager that routes based on keywords and capabilities
const manager = new ManagerAgent(adapter);

// The manager routes: "Calculate 15+27" → Calculator agent
const result = await manager.run('Calculate 15 + 27', adapter);
console.log(result); // "The result is 42"
```

> **Note:** Full example agents (Calculator, Weather) are available in the [GitHub repository](https://github.com/LordShiroe/agente-toolkit/tree/main/examples/agents) but not included in the npm package. Copy them to your project as needed.

## 📦 Installation

### From NPM (Recommended)

```bash
npm install agente-toolkit
```

Or using yarn:

```bash
yarn add agente-toolkit
```

Or using pnpm:

```bash
pnpm add agente-toolkit
```

### Requirements

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 4.9.0 (for TypeScript projects)

### From Source (Development)

```bash
git clone https://github.com/LordShiroe/agente-toolkit.git
cd agente-toolkit
npm install
npm run build
```

## 🚀 Quick Start

### 1. Set up your API key

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
# or for OpenAI
export OPENAI_API_KEY="your-api-key-here"
```

### 2. Create your first agent

```typescript
import { Agent, ClaudeAdapter } from 'agente-toolkit';

// Create agent
const agent = new Agent();
agent.setPrompt('You are a helpful assistant.');

// Create adapter
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

// Run!
const result = await agent.run('Hello! What can you help me with?', adapter);
console.log(result);
```

### 3. Add custom tools

```typescript
import { Agent, ClaudeAdapter } from 'agente-toolkit';
import { Type } from '@sinclair/typebox';

const agent = new Agent();

// Add a custom tool
agent.addTool({
  name: 'get_time',
  description: 'Get the current time',
  paramsSchema: Type.Object({}),
  action: async () => new Date().toLocaleTimeString(),
});

const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);
const result = await agent.run('What time is it?', adapter);
console.log(result); // "The current time is 2:30:45 PM"
```

## Programmatic Usage

### Basic Agent with Native Tool Support

```typescript
import { Agent, ClaudeAdapter } from 'agente-toolkit';

// Create agent with native tool calling support
const agent = new Agent();
agent.setPrompt('You are a helpful assistant.');
// agent.addTool(...) - Add your custom tools

// Claude adapter automatically uses native tools when available
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

// Get conversational responses regardless of execution method
const result = await agent.run('Hello!', adapter, {
  maxSteps: 8,
  stopOnFirstToolError: true,
});
console.log(result); // Natural, conversational response
```

### Intelligent Manager Agent with Native Tools

```typescript
import { ManagerAgent, registerAgent, ClaudeAdapter, Agent } from 'agente-toolkit';
import { Type } from '@sinclair/typebox';

// Create specialized agents
class CalculatorAgent extends Agent {
  constructor() {
    super();
    this.addTool({
      name: 'add',
      description: 'Add two numbers',
      paramsSchema: Type.Object({
        a: Type.Number({ description: 'First number' }),
        b: Type.Number({ description: 'Second number' }),
      }),
      action: async params => (params.a + params.b).toString(),
    });
  }

  static metadata = {
    metadata: {
      id: 'calculator',
      name: 'Calculator Agent',
      description: 'Performs arithmetic calculations',
      categories: ['math'],
      keywords: ['calculate', 'add', 'subtract', 'multiply', 'divide'],
      priority: 5,
    },
    capabilities: {
      taskTypes: ['arithmetic', 'calculations'],
      examples: ['What is 15 + 27?', 'Calculate 144 divided by 12'],
      limitations: ['Cannot handle complex mathematical functions'],
    },
  };
}

// Register agents with rich metadata
const calc = new CalculatorAgent();

registerAgent('calculator', calc, CalculatorAgent.metadata);

// Create adapter with native tool calling support
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

// Create manager that intelligently routes and provides conversational responses
const manager = new ManagerAgent(adapter);

// The manager intelligently routes with natural responses:
// "Calculate 15 + 27" → Calculator agent → "The result is 42"
// "What's 50 divided by 2?" → Calculator agent → "50 divided by 2 equals 25"

const result = await manager.run('What is 25 * 4?', adapter);
// Returns: "25 multiplied by 4 equals 100"
```

> **Pro Tip:** Check out the [examples directory](https://github.com/LordShiroe/agente-toolkit/tree/main/examples) for complete Calculator and Weather agent implementations.

### Architecture Benefits

```typescript
// Native tool calling (when supported)
const result1 = await agent.run('Weather in Paris', claudeAdapter);
// → Uses Claude's native tools → Conversational response

// Automatic fallback (when native tools fail or unavailable)
const result2 = await agent.run('Weather in Paris', basicAdapter);
// → Uses traditional planner → Converts to conversational response

// Both paths provide natural, user-friendly responses!
```

### Custom Agent with Modern Architecture

```typescript
import { Agent, AgentRegistration, ClaudeAdapter } from 'agente-toolkit';

class CustomAgent extends Agent {
  static readonly metadata: AgentRegistration = {
    metadata: {
      id: 'custom',
      name: 'Custom Agent',
      description: 'Handles custom tasks with native tool support',
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
    this.setPrompt('I am a helpful custom utility agent.');
    // Add custom tools that benefit from native calling...
  }
}

// Register and use with ManagerAgent (gets native tool benefits automatically)
registerAgent('custom', new CustomAgent(), CustomAgent.metadata);
const manager = new ManagerAgent(new ClaudeAdapter(process.env.ANTHROPIC_API_KEY));
```

## 🔧 Technical Highlights

### Execution Flow

1. **Agent receives request** → Memory retrieval → Context building
2. **ExecutionEngine decides** → Native tools (if supported) OR Traditional planner
3. **Native path**: Direct tool calling → Immediate conversational response
4. **Planned path**: Step-by-step execution → ResponseProcessor → Conversational response
5. **Result**: Always natural, user-friendly responses regardless of execution method

### Adapter Support

- **ClaudeAdapter**: Full native tool calling support with automatic fallback
- **Future adapters**: Can implement native tools or rely on traditional planning
- **Graceful degradation**: System works with any adapter capability level

## 📝 Notes

- **Native tool calling** provides faster, more natural interactions when available
- **Automatic fallback** ensures reliability across different model capabilities
- **Conversational responses** are generated for all execution paths
- **ManagerAgent** automatically benefits from native tools for all registered agents
- **Example agents** (Calculator, Weather) are available in the [GitHub repository](https://github.com/LordShiroe/agente-toolkit/tree/main/examples/agents) for reference
- **API Keys**: Ensure you have valid API keys for your chosen provider (Claude, OpenAI, Ollama)

## 📚 Documentation

See the docs for guides and references:

- Getting Started: [Installation](./docs/getting-started/installation.md) · [Quick Start](./docs/getting-started/quick-start.md) · [Configuration](./docs/getting-started/configuration.md)
- Guides: [Building Agents](./docs/guides/building-agents.md) · [Tool Development](./docs/guides/tool-development.md) · [RAG Integration](./docs/guides/rag-integration.md)
- Providers: [Claude](./docs/adapters/claude.md) · [OpenAI](./docs/adapters/openai.md) · [Ollama](./docs/adapters/ollama.md)

Reference: [CHANGELOG](./CHANGELOG.md) · [CONTRIBUTING](./CONTRIBUTING.md) · [SECURITY](./SECURITY.md) · [LOGGING](./LOGGING.md) · [Examples](./examples/README.md) · [RAG Example](./examples/rag-example.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- [npm Package](https://www.npmjs.com/package/agente-toolkit)
- [GitHub Repository](https://github.com/LordShiroe/agente-toolkit)
- [Issue Tracker](https://github.com/LordShiroe/agente-toolkit/issues)
- [Example Agents](https://github.com/LordShiroe/agente-toolkit/tree/main/examples/agents)
