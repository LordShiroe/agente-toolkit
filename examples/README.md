# agente-toolkit - Example Agents

This directory contains example agents demonstrating the capabilities of the agente-toolkit library.

**⚠️ Important:** These agents are **not included in the npm package**. They are available only in the GitHub repository as reference implementations for building your own agents.

## 📥 Using These Examples

### Option 1: Copy to Your Project (Recommended)

1. **Download the agent file** from GitHub:

   - [CalculatorAgent.ts](https://github.com/LordShiroe/agente-toolkit/blob/main/examples/agents/CalculatorAgent.ts)
   - [WeatherAgent.ts](https://github.com/LordShiroe/agente-toolkit/blob/main/examples/agents/WeatherAgent.ts)

2. **Copy to your project:**

   ```bash
   # Create agents directory in your project
   mkdir -p src/agents

   # Copy the agent file
   cp path/to/CalculatorAgent.ts src/agents/
   ```

3. **Update imports** in the copied file:

   ```typescript
   // Change this:
   import { Agent } from '../../src/core/agent/Agent';

   // To this (for npm users):
   import { Agent } from 'agente-toolkit';
   ```

4. **Use in your code:**

   ```typescript
   import { CalculatorAgent } from './src/agents/CalculatorAgent';
   import { ClaudeAdapter } from 'agente-toolkit';

   const calculator = new CalculatorAgent();
   const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);
   const result = await calculator.run('What is 15 + 27?', adapter);
   ```

### Option 2: Clone the Repository

If you're developing or contributing to agente-toolkit:

```bash
git clone https://github.com/LordShiroe/agente-toolkit.git
cd agente-toolkit
npm install
npm run build
```

Then the examples will be available in `examples/agents/`.

## Available Examples

### Multi-Source Docs QA (RAG Example)

**Location:** `examples/docs-qa/`

A fully runnable RAG (Retrieval-Augmented Generation) example that answers questions about this repository's documentation using local semantic search.

**Features:**

- Fully local (no API keys required)
- Uses `TransformersEmbedder` with Transformers.js (WASM)
- Ingests README and docs/guides/\*.md
- Smart chunking with metadata tracking
- Semantic search with citation support
- Optional OpenAI integration for full answers

**Quick Start:**

```bash
# Ask a question (auto-ingests on first run)
npx tsx examples/docs-qa/run.ts --q "How do I use RAG with retrieval?"

# With OpenAI for full answer
OPENAI_API_KEY=sk-... npx tsx examples/docs-qa/run.ts \
  --q "How do I configure RAG?" \
  --llm openai
```

See [examples/docs-qa/README.md](./docs-qa/README.md) for full documentation.

---

### CalculatorAgent

A simple agent that performs mathematical calculations.

**Features:**

- Basic arithmetic operations (add, subtract, multiply, divide)
- Demonstrates tool registration and execution
- Shows how to structure agent metadata

**Local Usage (after copying to your project):**

```typescript
// After copying CalculatorAgent.ts to your project and updating imports
import { CalculatorAgent } from './agents/CalculatorAgent';
import { ClaudeAdapter } from 'agente-toolkit';

const calculator = new CalculatorAgent();
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

// Run the agent
const result = await calculator.run('What is 15 + 27?', adapter);
console.log(result); // "The result is 42"
```

### WeatherAgent

A weather information agent that retrieves weather data for locations.

**Features:**

- Location-based weather queries
- Demonstrates external data integration patterns
- Shows real-world tool invocation scenarios

**Local Usage (after copying to your project):**

```typescript
// After copying WeatherAgent.ts to your project and updating imports
import { WeatherAgent } from './agents/WeatherAgent';
import { ClaudeAdapter } from 'agente-toolkit';

const weather = new WeatherAgent();
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

// Query weather information
const result = await weather.run('What is the weather in New York?', adapter);
console.log(result); // "The current weather in New York is 72°F with clear skies..."
```

## Building Your Own Agent

To create your own agent based on these examples:

1. **Define Agent Metadata:**

   ```typescript
   import { AgentRegistration } from 'agente-toolkit';

   static readonly metadata: AgentRegistration = {
     metadata: {
       id: 'myagent',
       name: 'My Agent',
       description: 'Description of what your agent does',
       categories: ['utility'],
       keywords: ['keyword1', 'keyword2'],
       priority: 5,
       enabled: true
     },
     capabilities: {
       taskTypes: ['task type 1', 'task type 2'],
       examples: ['Example task 1', 'Example task 2'],
       limitations: ['Limitation 1']
     }
   };
   ```

2. **Extend the Agent Base Class:**

   ```typescript
   import { Agent } from 'agente-toolkit';
   import { Type } from '@sinclair/typebox';

   class MyAgent extends Agent {
     constructor() {
       super(); // No parameters needed
       this.setPrompt('You are a helpful agent that...');
       this.setupTools();
     }

     private setupTools() {
       this.addTool({
         name: 'my_tool',
         description: 'What the tool does',
         paramsSchema: Type.Object({
           param: Type.String({ description: 'Parameter description' }),
         }),
         action: async params => {
           // Tool implementation
           return 'result';
         },
       });
     }

     getMetadata(): AgentRegistration {
       return MyAgent.metadata;
     }
   }
   ```

3. **Use Your Agent:**

   ```typescript
   import { MyAgent } from './agents/MyAgent';
   import { ClaudeAdapter } from 'agente-toolkit';

   const agent = new MyAgent();
   const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

   const result = await agent.run('Your request here', adapter);
   console.log(result);
   ```

4. **Use with ManagerAgent (for multi-agent orchestration):**

   ```typescript
   import { ManagerAgent, registerAgent } from 'agente-toolkit';
   import { MyAgent } from './agents/MyAgent';

   const myAgent = new MyAgent();
   registerAgent('myagent', myAgent, MyAgent.metadata);

   const manager = new ManagerAgent(adapter);
   const result = await manager.run('Your request here', adapter);
   // Manager will route to MyAgent if keywords match
   ```

## Testing Your Agent

When testing custom agents:

```bash
# In the agente-toolkit repository
npm test

# In your own project with copied agents
npm test -- your-agent.test.ts
```

For unit testing your agents:

```typescript
import { describe, it, expect } from 'vitest';
import { MyAgent } from './MyAgent';
import { ClaudeAdapter } from 'agente-toolkit';

describe('MyAgent', () => {
  it('should execute tool correctly', async () => {
    const agent = new MyAgent();
    const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

    const result = await agent.run('test query', adapter);
    expect(result).toBeDefined();
  });
});
```

## Moving Agents to Production

When you're ready to move an agent to production:

1. Move the agent file from `examples/` to your project's agent directory
2. Update imports throughout your application
3. Add comprehensive error handling and logging
4. Include integration tests
5. Document the agent's capabilities and limitations

---

For more information on building agents, see the [main README](../README.md) and the [core agent documentation](../src/core/agent/).
