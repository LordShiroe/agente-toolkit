# Configuration (Essentials)

Minimal setup to get productive quickly. Advanced options are linked at the end.

- Environment variables (.env)
- TypeScript basics (ESM vs CJS)
- Logging (Console/Silent)
- Memory (Sliding window)
- Execution options (RunOptions)
- Adapters (Claude, OpenAI, Ollama)

## Environment Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# LLM Provider API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...

# Ollama (optional)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest

# Application Settings
NODE_ENV=development
LOG_LEVEL=info
```

### Loading Environment Variables

#### Using dotenv (recommended)

```bash
npm install dotenv
```

```javascript
// At the top of your entry file
import 'dotenv/config';

// Or with require
require('dotenv').config();

// Now access variables
const apiKey = process.env.ANTHROPIC_API_KEY;
```

#### Using process.env directly

```javascript
const config = {
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
  ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  logLevel: process.env.LOG_LEVEL || 'info',
};
```

Tip: Use different `.env` files per environment (e.g., `.env.development`, `.env.production`).

### Type Imports

```typescript
// Import types explicitly
import type { Agent, Tool, RunOptions } from 'agente-toolkit';
import { ClaudeAdapter } from 'agente-toolkit';

// Or import everything
import { Agent, type Tool, type RunOptions, ClaudeAdapter } from 'agente-toolkit';
```

## Logging Configuration

### Default Console Logger

```typescript
import { Agent, ConsoleLogger } from 'agente-toolkit';

const logger = new ConsoleLogger();
const agent = new Agent(undefined, logger);
```

### Silent Logger (Production)

```typescript
import { Agent, SilentLogger } from 'agente-toolkit';

const logger = new SilentLogger();
const agent = new Agent(undefined, logger);
```

### Custom Logger (optional)

```typescript
import { AgentLogger } from 'agente-toolkit';
import winston from 'winston';

class WinstonLogger implements AgentLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
}

// Use it
const logger = new WinstonLogger();
const agent = new Agent(undefined, logger);
```

### Log Levels

Configure based on environment:

```typescript
const logLevel = {
  development: 'debug',
  production: 'warn',
  test: 'silent',
}[process.env.NODE_ENV || 'development'];

console.log(`Using log level: ${logLevel}`);
```

## Memory Configuration

### No Memory (stateless)

```typescript
import { Agent } from 'agente-toolkit';

// No memory - each interaction is independent
const agent = new Agent();
```

### Sliding Window Memory

```typescript
import { Agent, SlidingWindowMemoryManager } from 'agente-toolkit';

// Keep up to 10 memories (approx. sliding window)
const memory = new SlidingWindowMemoryManager(10);
const agent = new Agent(memory);
```

### Custom Memory (advanced)

```typescript
import { MemoryManager } from 'agente-toolkit';

class RedisMemoryManager implements MemoryManager {
  private redis: RedisClient;

  async addMemory(content: string, metadata?: any): Promise<void> {
    await this.redis.lpush(
      'memories',
      JSON.stringify({ content, metadata, timestamp: Date.now() })
    );
  }

  async getRelevantMemories(
    query: string,
    limit?: number
  ): Promise<Array<{ content: string; relevance: number }>> {
    const memories = await this.redis.lrange('memories', 0, limit || 10);
    // Implement relevance scoring
    return memories.map(m => ({
      content: JSON.parse(m).content,
      relevance: this.calculateRelevance(query, JSON.parse(m).content),
    }));
  }

  async clearMemories(): Promise<void> {
    await this.redis.del('memories');
  }

  private calculateRelevance(query: string, memory: string): number {
    // Implement similarity algorithm
    return 0.5;
  }
}
```

## Execution Options

### RunOptions Interface

```typescript
interface RunOptions {
  maxSteps?: number;
  maxDurationMs?: number;
  stopOnFirstToolError?: boolean;
  requiredOutputRegex?: string;
}
```

### Basic Configuration

```typescript
const result = await agent.run('Your query here', adapter, {
  maxSteps: 15,
  maxDurationMs: 60000,
  stopOnFirstToolError: true,
});
```

### Environment-Based Configuration

```typescript
const executionOptions = {
  development: {
    maxSteps: 20,
    maxDurationMs: 120000,
    stopOnFirstToolError: false, // Continue on errors for debugging
  },
  production: {
    maxSteps: 10,
    maxDurationMs: 30000,
    stopOnFirstToolError: true, // Fail fast
  },
};

const options = executionOptions[process.env.NODE_ENV] || executionOptions.development;
const result = await agent.run('query', adapter, options);
```

## Adapter Configuration

### Claude (Anthropic)

```typescript
import { ClaudeAdapter } from 'agente-toolkit';

const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY, 'claude-sonnet-4-20250514');
```

### OpenAI

```typescript
import { OpenAIAdapter } from 'agente-toolkit';

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, 'gpt-4o');
```

### Ollama (Local)

```typescript
import { OllamaAdapter } from 'agente-toolkit';

const adapter = new OllamaAdapter(
  process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  process.env.OLLAMA_MODEL || 'llama3.2:latest'
);
```

## Agent Configuration

### Agent Prompts

```typescript
import { Agent } from 'agente-toolkit';

const agent = new Agent();

// Set system prompt
agent.setPrompt(`You are a helpful assistant that:
- Provides accurate information
- Uses tools when appropriate
- Responds conversationally
- Admits when uncertain`);
```

### Agent Metadata (optional)

```typescript
import { AgentRegistration } from 'agente-toolkit';

const metadata: AgentRegistration = {
  metadata: {
    id: 'my-agent',
    name: 'My Custom Agent',
    description: 'Handles specific tasks',
    categories: ['utility', 'data'],
    keywords: ['process', 'analyze', 'data'],
    priority: 5,
    enabled: true,
  },
  capabilities: {
    taskTypes: ['data processing', 'analysis'],
    examples: ['Process this data', 'Analyze the results'],
    limitations: ['Cannot access external APIs'],
  },
};
```

## Complete Configuration Example (concise)

Here's a production-ready configuration:

```typescript
// config/agent-config.ts
import 'dotenv/config';
import { Agent, ClaudeAdapter, SlidingWindowMemoryManager, ConsoleLogger } from 'agente-toolkit';

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Logger
const logger = new ConsoleLogger();

// Memory
const memory = new SlidingWindowMemoryManager(isDevelopment ? 20 : 10);

// Adapter
const adapter = new ClaudeAdapter(
  process.env.ANTHROPIC_API_KEY!,
  process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514'
);

// Execution options
export const executionOptions = {
  maxSteps: parseInt(process.env.MAX_STEPS || (isProduction ? '10' : '20')),
  maxDurationMs: parseInt(process.env.MAX_DURATION || (isProduction ? '30000' : '60000')),
  stopOnFirstToolError: isProduction,
};

// Create agent
export const createAgent = () => {
  const agent = new Agent(memory, logger);
  agent.setPrompt(process.env.AGENT_PROMPT || 'You are a helpful assistant.');
  return agent;
};

// Export configured instances
export { adapter, logger, memory };
```

Usage:

```typescript
// app.ts
import { createAgent, adapter, executionOptions } from './config/agent-config';

const agent = createAgent();
const result = await agent.run('Hello!', adapter, executionOptions);
```

## Best Practices

1. **Use environment variables** for sensitive data (API keys)
2. **Configure logging** based on environment (silent in production)
3. **Set appropriate timeouts** to prevent hanging requests
4. **Use TypeScript strict mode** for better type safety
5. **Implement error handling** for all agent interactions
6. **Monitor memory usage** if using persistent memory
7. **Version control** your configuration but not `.env` files

## Next Steps

- Advanced config and patterns: [../guides/advanced-patterns.md](../guides/advanced-patterns.md)
- Adapters: [../adapters](../adapters)
- Troubleshooting: [../troubleshooting.md](../troubleshooting.md)

- [Building Agents Guide](../guides/building-agents.md)
- [Adapter-Specific Guides](../adapters/)
- [Tool Development](../guides/tool-development.md)
- [Troubleshooting](../troubleshooting.md)
