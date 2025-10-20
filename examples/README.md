# AiNoob Toolkit - Example Agents

This directory contains example agents demonstrating the capabilities of the agente-toolkit library. These agents are not part of the core library API and should not be used in production. They serve as references for building your own agents.

## Available Examples

### CalculatorAgent

A simple agent that performs mathematical calculations.

**Features:**

- Basic arithmetic operations (add, subtract, multiply, divide)
- Demonstrates tool registration and execution
- Shows how to structure agent metadata

**Usage:**

```typescript
import { CalculatorAgent } from 'agente-toolkit/examples/agents';
import { ClaudeAdapter } from 'agente-toolkit';

const calculator = new CalculatorAgent();
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

// Use the calculator through the adapter
const result = await adapter.invoke('What is 15 + 27?', calculator.getTools());
```

### WeatherAgent

A weather information agent that retrieves weather data for locations.

**Features:**

- Location-based weather queries
- Demonstrates external data integration patterns
- Shows real-world tool invocation scenarios

**Usage:**

```typescript
import { WeatherAgent } from 'agente-toolkit/examples/agents';
import { ClaudeAdapter } from 'agente-toolkit';

const weather = new WeatherAgent();
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

// Query weather information
const result = await adapter.invoke('What is the weather in New York?', weather.getTools());
```

## Building Your Own Agent

To create your own agent based on these examples:

1. **Define Agent Metadata:**

   ```typescript
   static metadata: AgentMetadata = {
     name: 'MyAgent',
     description: 'Description of what your agent does',
     version: '1.0.0',
   };
   ```

2. **Extend the Agent Base Class:**

   ```typescript
   import { Agent } from 'agente-toolkit';

   class MyAgent extends Agent {
     constructor() {
       super('MyAgent', 'Description');
     }

     getTools(): Tool[] {
       // Define your tools here
     }
   }
   ```

3. **Register Tools:**

   ```typescript
   private tools: Tool[] = [
     {
       name: 'tool-name',
       description: 'What the tool does',
       inputSchema: { /* JSON Schema */ },
       execute: async (input) => {
         // Tool implementation
       },
     },
   ];
   ```

4. **Use with ManagerAgent:**

   ```typescript
   import { ManagerAgent, registerAgent } from 'agente-toolkit';

   const manager = new ManagerAgent(adapter);
   registerAgent('myagent', new MyAgent(), MyAgent.metadata);
   ```

## Testing Your Agent

Example agents include test fixtures. To run tests:

```bash
npm test -- examples
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
