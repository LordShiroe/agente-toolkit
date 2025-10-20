# agente-toolkit

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
import { CalculatorAgent, WeatherAgent } from './examples/agents';

// Register example agents with their metadata
registerAgent('calculator', new CalculatorAgent(), CalculatorAgent.metadata);
registerAgent('weather', new WeatherAgent(), WeatherAgent.metadata);

// Create adapter with native tool support
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

// Create intelligent manager that routes based on keywords and capabilities
const manager = new ManagerAgent(adapter);
// Now handles: "Calculate 15+27" → Calculator, "Weather in NYC" → Weather
// All with conversational responses!
```

## 📦 Install

Clone and install dependencies:

```bash
git clone <repository-url>
cd agente-toolkit
npm install
npm run build
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
import { ManagerAgent, registerAgent, ClaudeAdapter } from 'agente-toolkit';
import { CalculatorAgent, WeatherAgent } from './examples/agents';

// Register example agents with rich metadata
const calc = new CalculatorAgent();
const weather = new WeatherAgent();

registerAgent('calculator', calc, CalculatorAgent.metadata);
registerAgent('weather', weather, WeatherAgent.metadata);

// Create adapter with native tool calling support
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

// Create manager that intelligently routes and provides conversational responses
const manager = new ManagerAgent(adapter);

// The manager intelligently routes with natural responses:
// "Calculate 15 + 27" → Calculator agent → "The result is 42"
// "Weather in Tokyo" → Weather agent → "Current weather in Tokyo is 22°C with clear skies"
// "What's 50 divided by 2?" → Calculator agent → "50 divided by 2 equals 25"

const result = await manager.run('What is 25 * 4?', adapter);
// Returns: "25 multiplied by 4 equals 100"
```

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
- **Weather functions** call public APIs; ensure network access when using them
- **Verbose logging** (`--verbose`) shows detailed execution flow including native vs planned paths
