# Tool Development Guide

Learn how to create powerful, reliable tools for your AI agents. This guide covers everything from basic tools to advanced patterns.

## Table of Contents

- [Tool Fundamentals](#tool-fundamentals)
- [Creating Tools](#creating-tools)
- [Parameter Schemas](#parameter-schemas)
- [Advanced Patterns](#advanced-patterns)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Real-World Examples](#real-world-examples)

## Tool Fundamentals

### What is a Tool?

A tool is a function that an AI agent can call to perform actions, retrieve data, or interact with external systems.

### Tool Structure

```typescript
interface Tool {
  name: string; // Unique identifier
  description: string; // What the tool does (used by LLM)
  paramsSchema: TSchema; // TypeBox schema for parameters
  action: (params) => Promise<string>; // Implementation
}
```

### How Tools Work

```
User: "What time is it?"
  ↓
Agent decides to use `get_time` tool
  ↓
Tool executes and returns "2:30 PM"
  ↓
Agent: "The current time is 2:30 PM"
```

## Creating Tools

### Basic Tool (No Parameters)

```typescript
import { Type } from '@sinclair/typebox';

agent.addTool({
  name: 'get_time',
  description: 'Get the current time',
  paramsSchema: Type.Object({}), // Empty object = no parameters
  action: async () => {
    return new Date().toLocaleTimeString();
  },
});
```

### Tool with Single Parameter

```typescript
agent.addTool({
  name: 'square_number',
  description: 'Calculate the square of a number',
  paramsSchema: Type.Object({
    number: Type.Number({ description: 'Number to square' }),
  }),
  action: async params => {
    return (params.number ** 2).toString();
  },
});
```

### Tool with Multiple Parameters

```typescript
agent.addTool({
  name: 'calculate_bmi',
  description: 'Calculate Body Mass Index',
  paramsSchema: Type.Object({
    weight: Type.Number({ description: 'Weight in kilograms' }),
    height: Type.Number({ description: 'Height in meters' }),
  }),
  action: async params => {
    const bmi = params.weight / params.height ** 2;
    return `BMI: ${bmi.toFixed(2)}`;
  },
});
```

## Parameter Schemas

### Basic Types

```typescript
// String
Type.String({ description: 'A text value' });

// Number
Type.Number({ description: 'A numeric value' });

// Boolean
Type.Boolean({ description: 'True or false' });

// Integer
Type.Integer({ description: 'Whole number only' });
```

### Constraints

```typescript
// Number with constraints
Type.Number({
  description: 'Age in years',
  minimum: 0,
  maximum: 150,
});

// String with pattern
Type.String({
  description: 'Email address',
  pattern: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$',
});

// String with length
Type.String({
  description: 'Username',
  minLength: 3,
  maxLength: 20,
});

// Enum
Type.Union([Type.Literal('small'), Type.Literal('medium'), Type.Literal('large')], {
  description: 'Size option',
});
```

### Optional Parameters

```typescript
Type.Object({
  name: Type.String({ description: 'Required name' }),
  age: Type.Optional(Type.Number({ description: 'Optional age' })),
  email: Type.Optional(Type.String({ description: 'Optional email' })),
});
```

### Complex Schemas

#### Arrays

```typescript
Type.Object({
  numbers: Type.Array(Type.Number(), {
    description: 'List of numbers to process',
    minItems: 1,
    maxItems: 100,
  }),
});
```

#### Nested Objects

```typescript
Type.Object({
  user: Type.Object({
    name: Type.String(),
    contact: Type.Object({
      email: Type.String(),
      phone: Type.Optional(Type.String()),
    }),
  }),
});
```

#### Union Types

```typescript
Type.Object({
  input: Type.Union([
    Type.String({ description: 'Text input' }),
    Type.Number({ description: 'Numeric input' }),
  ]),
});
```

## Advanced Patterns

This guide focuses on the essentials. Advanced scenarios (external APIs with retries, file system safety, stateful tools, streaming) are covered in [Advanced Patterns](./advanced-patterns.md#advanced-tool-patterns).

### Pattern 1: Async External API

```typescript
## Real-World Examples

For complete pipelines (e.g., weather chain, CSV processing), see [Advanced Patterns](./advanced-patterns.md).
      // Security: Prevent path traversal
      const safePath = path.normalize(params.filepath).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.join(process.cwd(), safePath);

      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      return `Error reading file: ${error.message}`;
    }
  },
});
```

### Pattern 4: Stateful Tools

```typescript
class StatefulAgent extends Agent {
  private cache: Map<string, any> = new Map();

  constructor() {
    super();
    this.setupTools();
  }

  private setupTools() {
    this.addTool({
      name: 'cache_value',
      description: 'Store a value in cache',
      paramsSchema: Type.Object({
        key: Type.String(),
        value: Type.String(),
      }),
      action: async params => {
        this.cache.set(params.key, params.value);
        return `Cached: ${params.key}`;
      },
    });

    this.addTool({
      name: 'get_cached',
      description: 'Retrieve cached value',
      paramsSchema: Type.Object({
        key: Type.String(),
      }),
      action: async params => {
        const value = this.cache.get(params.key);
        return value || `No value found for key: ${params.key}`;
      },
    });
  }
}
```

### Pattern 5: Streaming Data

```typescript
agent.addTool({
  name: 'process_large_file',
  description: 'Process large file in chunks',
  paramsSchema: Type.Object({
    filepath: Type.String(),
  }),
  action: async params => {
    const stream = fs.createReadStream(params.filepath);
    let lineCount = 0;

    for await (const chunk of stream) {
      const lines = chunk.toString().split('\n');
      lineCount += lines.length;
    }

    return `Processed ${lineCount} lines`;
  },
});
```

## Error Handling

### Basic Try-Catch

```typescript
action: async params => {
  try {
    const result = await riskyOperation(params);
    return result;
  } catch (error) {
    return `Error: ${error.message}`;
  }
};
```

### Specific Error Types

```typescript
action: async params => {
  try {
    const response = await fetch(params.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof TypeError) {
      return `Network error: ${error.message}`;
    }
    if (error instanceof SyntaxError) {
      return `Invalid response format`;
    }
    return `Error: ${error.message}`;
  }
};
```

### Validation Before Execution

```typescript
action: async params => {
  // Validate email format
  if (!params.email.includes('@')) {
    return 'Error: Invalid email format';
  }

  // Validate URL
  try {
    new URL(params.url);
  } catch {
    return 'Error: Invalid URL format';
  }

  // Proceed with operation
  const result = await sendEmail(params);
  return result;
};
```

## Best Practices

### 1. Always Return Strings

✅ Good:

```typescript
action: async params => {
  const result = params.a + params.b;
  return result.toString(); // Convert to string
};
```

❌ Bad:

```typescript
action: async params => {
  return params.a + params.b; // Returns number
};
```

### 2. Provide Clear Descriptions

✅ Good:

```typescript
{
  name: 'calculate_shipping_cost',
  description: 'Calculate shipping cost based on weight, distance, and shipping method',
  // ...
}
```

❌ Bad:

```typescript
{
  name: 'calc',
  description: 'Does calculation',
  // ...
}
```

### 3. Use Descriptive Parameter Names

✅ Good:

```typescript
paramsSchema: Type.Object({
  sourceAddress: Type.String({ description: 'Origin address' }),
  destinationAddress: Type.String({ description: 'Delivery address' }),
  packageWeight: Type.Number({ description: 'Weight in kilograms' }),
});
```

❌ Bad:

```typescript
paramsSchema: Type.Object({
  a: Type.String(),
  b: Type.String(),
  c: Type.Number(),
});
```

### 4. Handle Edge Cases

```typescript
action: async params => {
  // Check for division by zero
  if (params.denominator === 0) {
    return 'Error: Cannot divide by zero';
  }

  // Check for null/undefined
  if (!params.value) {
    return 'Error: Value is required';
  }

  // Check array length
  if (params.items.length === 0) {
    return 'Error: No items to process';
  }

  // Proceed with operation
  return result;
};
```

### 5. Limit Resource Usage

```typescript
action: async params => {
  // Limit array size
  if (params.items.length > 1000) {
    return 'Error: Too many items (max 1000)';
  }

  // Set timeout
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Operation timeout')), 30000)
  );

  const operationPromise = performOperation(params);

  try {
    const result = await Promise.race([operationPromise, timeoutPromise]);
    return result;
  } catch (error) {
    return `Error: ${error.message}`;
  }
};
```

### 6. Log Tool Usage

```typescript
action: async params => {
  console.log(`Tool 'send_email' called with:`, params);

  try {
    const result = await sendEmail(params);
    console.log(`Email sent successfully to ${params.to}`);
    return result;
  } catch (error) {
    console.error(`Email failed:`, error);
    return `Error: ${error.message}`;
  }
};
```

## Real-World Examples

### Example 1: Weather Tool Chain

```typescript
// Tool 1: Geocode location
agent.addTool({
  name: 'geocode',
  description: 'Convert location name to coordinates',
  paramsSchema: Type.Object({
    location: Type.String(),
  }),
  action: async params => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      params.location
    )}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'agente-toolkit' },
    });
    const data = await response.json();
    if (data.length === 0) {
      return JSON.stringify({ error: 'Location not found' });
    }
    return JSON.stringify({
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    });
  },
});

// Tool 2: Get weather
agent.addTool({
  name: 'get_weather',
  description: 'Get weather for coordinates',
  paramsSchema: Type.Object({
    lat: Type.Number(),
    lon: Type.Number(),
  }),
  action: async params => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${params.lat}&longitude=${params.lon}&current_weather=true`;
    const response = await fetch(url);
    const data = await response.json();
    return JSON.stringify(data.current_weather);
  },
});
```

### Example 2: Data Processing Pipeline

```typescript
agent.addTool({
  name: 'process_csv',
  description: 'Process CSV data and calculate statistics',
  paramsSchema: Type.Object({
    csv_data: Type.String({ description: 'CSV formatted data' }),
    column: Type.String({ description: 'Column to analyze' }),
  }),
  action: async params => {
    const lines = params.csv_data.split('\n');
    const headers = lines[0].split(',');
    const columnIndex = headers.indexOf(params.column);

    if (columnIndex === -1) {
      return `Error: Column '${params.column}' not found`;
    }

    const values = lines
      .slice(1)
      .map(line => parseFloat(line.split(',')[columnIndex]))
      .filter(v => !isNaN(v));

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return JSON.stringify({ avg, max, min, count: values.length });
  },
});
```

## Next Steps

- [Building Agents Guide](./building-agents.md)
- [Memory Management](./memory-management.md)
- [API Reference](../api/tools.md)

## Resources

- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [JSON Schema](https://json-schema.org/)
- [Example Agents](https://github.com/LordShiroe/agente-toolkit/tree/main/examples)
