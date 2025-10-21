# Building Custom Agents

This comprehensive guide teaches you how to build custom AI agents with agente-toolkit, from simple single-purpose agents to complex multi-agent systems.

## Table of Contents

- [Agent Fundamentals](#agent-fundamentals)
- [Creating Your First Agent](#creating-your-first-agent)
- [Agent Architecture](#agent-architecture)
- [Adding Tools](#adding-tools)
- [Agent Metadata](#agent-metadata)
- [Multi-Agent Systems](#multi-agent-systems)
- [Best Practices](#best-practices)
- [Real-World Examples](#real-world-examples)

## Agent Fundamentals

### What is an Agent?

An agent in agente-toolkit is an autonomous entity that:

- Receives natural language input
- Decides which tools to use
- Executes tools in the right sequence
- Returns conversational responses

### Agent Lifecycle

```
User Input → Agent → Tool Selection → Tool Execution → Response Processing → User Output
```

### Key Components

1. **Prompt**: Defines agent behavior and personality
2. **Tools**: Functions the agent can call
3. **Memory**: Optional context retention
4. **Adapter**: Connection to LLM (Claude, OpenAI, etc.)
5. **Logger**: Execution monitoring

## Creating Your First Agent

### Step 1: Extend the Base Agent Class

```typescript
import { Agent } from 'agente-toolkit';

class MyAgent extends Agent {
  constructor() {
    super(); // Call parent constructor
    this.setupPrompt();
    this.setupTools();
  }

  private setupPrompt() {
    this.setPrompt('You are a helpful assistant specialized in...');
  }

  private setupTools() {
    // Add tools here
  }
}
```

### Step 2: Define Agent Behavior

```typescript
class CalculatorAgent extends Agent {
  constructor() {
    super();
    this.setPrompt(`You are a calculator assistant. When users ask for calculations:
    1. Use the available math tools
    2. Show the calculation clearly
    3. Provide the final answer
    
    Always be precise and explain your work.`);
    this.setupTools();
  }

  // ... tools setup
}
```

### Step 3: Add Tools

```typescript
import { Type } from '@sinclair/typebox';

class CalculatorAgent extends Agent {
  constructor() {
    super();
    this.setPrompt('You are a calculator assistant.');
    this.setupTools();
  }

  private setupTools() {
    // Addition
    this.addTool({
      name: 'add',
      description: 'Add two numbers together',
      paramsSchema: Type.Object({
        a: Type.Number({ description: 'First number' }),
        b: Type.Number({ description: 'Second number' }),
      }),
      action: async params => {
        const result = params.a + params.b;
        return result.toString();
      },
    });

    // Subtraction
    this.addTool({
      name: 'subtract',
      description: 'Subtract second number from first',
      paramsSchema: Type.Object({
        a: Type.Number({ description: 'Number to subtract from' }),
        b: Type.Number({ description: 'Number to subtract' }),
      }),
      action: async params => {
        return (params.a - params.b).toString();
      },
    });
  }
}
```

### Step 4: Use Your Agent

```typescript
import { ClaudeAdapter } from 'agente-toolkit';

const agent = new CalculatorAgent();
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);

const result = await agent.run('What is 15 + 27?', adapter);
console.log(result); // "15 + 27 equals 42"
```

## Agent Architecture (Essentials)

### Agent Class Hierarchy

Keep it simple: an Agent stores tools, memory, a prompt, and a logger. You extend Agent, set a prompt, and add tools. For a deeper dive, see Advanced Patterns.

### Anatomy of an Agent

```typescript
class CompleteAgent extends Agent {
  // 1. Static Metadata (for registration)
  static readonly metadata = {
    metadata: {
      id: 'complete-agent',
      name: 'Complete Agent',
      description: 'A fully-featured example agent',
      categories: ['example', 'utility'],
      keywords: ['demo', 'example', 'complete'],
      priority: 5,
      enabled: true,
    },
    capabilities: {
      taskTypes: ['demonstration', 'example tasks'],
      examples: ['Show me an example', 'Demonstrate this'],
      limitations: ['This is just an example'],
    },
  };

  // 2. Constructor
  constructor(memory?, logger?) {
    super(memory, logger);
    this.initializeAgent();
  }

  // 3. Initialization
  private initializeAgent() {
    this.setPrompt(this.buildPrompt());
    this.registerTools();
  }

  // 4. Prompt Definition
  private buildPrompt(): string {
    return `You are a helpful assistant that:
    - Uses tools effectively
    - Provides clear responses
    - Handles errors gracefully`;
  }

  // 5. Tool Registration
  private registerTools() {
    this.addTool({
      name: 'example_tool',
      description: 'An example tool',
      paramsSchema: Type.Object({
        input: Type.String(),
      }),
      action: async params => {
        return `Processed: ${params.input}`;
      },
    });
  }

  // 6. Metadata Getter
  getMetadata() {
    return CompleteAgent.metadata;
  }

  // 7. Custom Methods (optional)
  async processData(data: any) {
    // Custom logic
  }
}
```

## Adding Tools

### Tool Structure

```typescript
interface Tool {
  name: string; // Unique tool identifier
  description: string; // What the tool does
  paramsSchema: TSchema; // TypeBox schema for parameters
  action: (params) => Promise<string>; // Tool implementation
}
```

### Simple Tool Example

```typescript
this.addTool({
  name: 'get_time',
  description: 'Get the current time',
  paramsSchema: Type.Object({}), // No parameters
  action: async () => {
    return new Date().toLocaleTimeString();
  },
});
```

### Tool with Parameters

```typescript
this.addTool({
  name: 'greet_user',
  description: 'Greet a user by name',
  paramsSchema: Type.Object({
    name: Type.String({ description: 'User name to greet' }),
    formal: Type.Optional(Type.Boolean({ description: 'Use formal greeting' })),
  }),
  action: async params => {
    const greeting = params.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${params.name}!`;
  },
});
```

### Tool with External API

```typescript
import fetch from 'node-fetch';

this.addTool({
  name: 'fetch_weather',
  description: 'Get current weather for a location',
  paramsSchema: Type.Object({
    city: Type.String({ description: 'City name' }),
    country: Type.Optional(Type.String({ description: 'Country code' })),
  }),
  action: async params => {
    try {
      const query = params.country ? `${params.city},${params.country}` : params.city;

      // Geocode
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}`;
      const geoResponse = await fetch(geoUrl, {
        headers: { 'User-Agent': 'agente-toolkit-agent' },
      });
      const geoData = await geoResponse.json();

      if (geoData.length === 0) {
        return `Could not find location: ${query}`;
      }

      const { lat, lon } = geoData[0];

      // Get weather
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const weatherResponse = await fetch(weatherUrl);
      const weatherData = await weatherResponse.json();

      return JSON.stringify(weatherData.current_weather);
    } catch (error) {
      return `Error fetching weather: ${error.message}`;
    }
  },
});
```

### Tool with Validation and Error Handling

```typescript
this.addTool({
  name: 'divide',
  description: 'Divide two numbers',
  paramsSchema: Type.Object({
    numerator: Type.Number({ description: 'Number to divide' }),
    denominator: Type.Number({ description: 'Number to divide by' }),
  }),
  action: async params => {
    // Validation
    if (params.denominator === 0) {
      throw new Error('Cannot divide by zero');
    }

    if (!Number.isFinite(params.numerator) || !Number.isFinite(params.denominator)) {
      throw new Error('Parameters must be finite numbers');
    }

    // Calculation
    const result = params.numerator / params.denominator;

    // Formatting
    return result.toFixed(2);
  },
});
```

### Tool with Complex Schema

```typescript
this.addTool({
  name: 'search_database',
  description: 'Search database with filters',
  paramsSchema: Type.Object({
    query: Type.String({ description: 'Search query' }),
    filters: Type.Optional(
      Type.Object({
        category: Type.Optional(Type.String()),
        minPrice: Type.Optional(Type.Number()),
        maxPrice: Type.Optional(Type.Number()),
        inStock: Type.Optional(Type.Boolean()),
      })
    ),
    limit: Type.Optional(
      Type.Number({
        description: 'Maximum results',
        minimum: 1,
        maximum: 100,
        default: 10,
      })
    ),
    sortBy: Type.Optional(
      Type.Union([Type.Literal('price'), Type.Literal('name'), Type.Literal('date')])
    ),
  }),
  action: async params => {
    // Implementation
    const results = await database.search(params);
    return JSON.stringify(results);
  },
});
```

## Agent Metadata

### Why Metadata Matters

Metadata enables:

- Agent discovery in multi-agent systems
- Intelligent routing by ManagerAgent
- Agent capability documentation
- Priority-based selection

### Complete Metadata Example

```typescript
import { AgentRegistration } from 'agente-toolkit';

class DataAnalysisAgent extends Agent {
  static readonly metadata: AgentRegistration = {
    metadata: {
      // Unique identifier
      id: 'data-analysis',

      // Human-readable name
      name: 'Data Analysis Agent',

      // Clear description of purpose
      description: 'Analyzes datasets and provides statistical insights',

      // Categories for grouping
      categories: ['data', 'analysis', 'statistics'],

      // Keywords for routing (IMPORTANT!)
      keywords: [
        'analyze',
        'analysis',
        'data',
        'statistics',
        'stats',
        'dataset',
        'mean',
        'median',
        'average',
        'correlation',
        'regression',
      ],

      // Priority (1-10, higher = more important)
      priority: 7,

      // Whether agent is active
      enabled: true,
    },

    capabilities: {
      // Types of tasks this agent handles
      taskTypes: [
        'statistical analysis',
        'data visualization',
        'trend identification',
        'outlier detection',
      ],

      // Example requests (helps with routing)
      examples: [
        'Analyze this dataset',
        'What is the average of these numbers?',
        'Find outliers in the data',
        'Show correlation between X and Y',
      ],

      // What this agent CANNOT do
      limitations: [
        'Cannot access external databases',
        'Limited to datasets under 10,000 rows',
        'No real-time data processing',
      ],
    },
  };

  // Must implement getMetadata()
  getMetadata(): AgentRegistration {
    return DataAnalysisAgent.metadata;
  }
}
```

### Metadata Best Practices

1. **Keywords**: Include synonyms and related terms
2. **Examples**: Cover common use cases
3. **Limitations**: Be honest about constraints
4. **Priority**: Reserve 9-10 for critical agents
5. **Description**: One clear sentence

## Multi-Agent Systems (Overview)

### Registering Agents

Use `registerAgent` to register specialists and `ManagerAgent` to route automatically. Keep agents focused and metadata descriptive.

More examples: see [Advanced Patterns](./advanced-patterns.md#multi-agent-orchestration).

### Agent Discovery

```typescript
import { getAvailableAgents, findAgentsByKeywords } from 'agente-toolkit';

// List all registered agents
const allAgents = getAvailableAgents();
console.log(
  'Available agents:',
  allAgents.map(a => a.name)
);

// Find agents by keyword
const mathAgents = findAgentsByKeywords(['calculate', 'math']);
console.log('Math agents:', mathAgents);
```

## Best Practices (Quick)

### 1. Single Responsibility

✅ Good:

```typescript
class EmailAgent extends Agent {
  // Focuses only on email tasks
}
```

❌ Bad:

```typescript
class EmailAndWeatherAndCalculatorAgent extends Agent {
  // Does too many unrelated things
}
```

### 2. Clear Tool Names

✅ Good:

```typescript
this.addTool({
  name: 'send_email',
  description: 'Send an email to a recipient',
});
```

❌ Bad:

```typescript
this.addTool({
  name: 'do_thing',
  description: 'Does something',
});
```

### 3. Descriptive Prompts

✅ Good:

```typescript
this.setPrompt(`You are an email assistant that:
- Helps compose professional emails
- Checks grammar and tone
- Suggests improvements
Always maintain a professional tone.`);
```

❌ Bad:

```typescript
this.setPrompt('You help with emails.');
```

### 4. Error Handling

✅ Good:

```typescript
action: async params => {
  try {
    const result = await externalAPI(params);
    return JSON.stringify(result);
  } catch (error) {
    return `Error: ${error.message}. Please try again.`;
  }
};
```

❌ Bad:

```typescript
action: async params => {
  const result = await externalAPI(params); // May throw
  return JSON.stringify(result);
};
```

### 5. Parameter Validation

✅ Good:

```typescript
paramsSchema: Type.Object({
  email: Type.String({
    description: 'Email address',
    format: 'email',
  }),
  age: Type.Number({
    description: 'Age in years',
    minimum: 0,
    maximum: 150,
  }),
});
```

❌ Bad:

```typescript
paramsSchema: Type.Object({
  email: Type.String(),
  age: Type.Number(),
});
```

## Real-World Examples (Links)

See [Advanced Patterns](./advanced-patterns.md) for complete examples.

### Example 2: Database Agent

```typescript
class DatabaseAgent extends Agent {
  constructor(private db: Database) {
    super();
    this.setPrompt('You are a database query assistant.');
    this.setupTools();
  }

  private setupTools() {
    this.addTool({
      name: 'query_database',
      description: 'Execute a safe database query',
      paramsSchema: Type.Object({
        table: Type.String(),
        conditions: Type.Optional(Type.Object({})),
      }),
      action: async params => {
        // Only allow SELECT queries for safety
        const results = await this.db.select(params.table, params.conditions);
        return JSON.stringify(results, null, 2);
      },
    });
  }
}
```

## Next Steps

- [Tool Development Guide](./tool-development.md) - Advanced tool patterns
- [Memory Management](./memory-management.md) - Implementing custom memory
- [Adapter Guide](../adapters/) - Understanding LLM adapters
- [API Reference](../api/agent.md) - Complete Agent API

## Resources

- [Example Agents](https://github.com/LordShiroe/agente-toolkit/tree/main/examples/agents)
- [Architecture Decision Records](https://github.com/LordShiroe/agente-toolkit/tree/main/adr)
- [GitHub Discussions](https://github.com/LordShiroe/agente-toolkit/discussions)
