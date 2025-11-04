# Injectable Logging System

The agente-toolkit library supports injectable logging, giving you full control over where monitoring logs go.

## Quick Start

### Using the Default Console Logger

```typescript
import { Agent, ClaudeAdapter } from 'agente-toolkit';

const agent = new Agent(); // Uses ConsoleLogger by default
const model = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY!);

await agent.run('Hello world', model);
```

### Using a Silent Logger (No Logging)

```typescript
import { Agent, SilentLogger, ClaudeAdapter } from 'agente-toolkit';

const silentLogger = new SilentLogger();
const agent = new Agent(undefined, silentLogger); // No logs output
const model = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY!);

await agent.run('Hello world', model);
```

### Using a Custom Logger

```typescript
import { Agent, AgentLogger, ClaudeAdapter } from 'agente-toolkit';

// Implement your own logger
class MyCustomLogger implements AgentLogger {
  info(message: string, meta?: any): void {
    // Send to your logging service
    myLoggingService.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    myLoggingService.warn(message, meta);
  }

  error(message: string, meta?: any): void {
    myLoggingService.error(message, meta);
  }

  debug(message: string, meta?: any): void {
    myLoggingService.debug(message, meta);
  }
}

const customLogger = new MyCustomLogger();
const agent = new Agent(undefined, customLogger);
const model = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY!);

await agent.run('Hello world', model);
```

## Integration Examples

### Winston Logger

```typescript
import winston from 'winston';
import { AgentLogger } from 'agente-toolkit';

class WinstonAgentLogger implements AgentLogger {
  private winston: winston.Logger;

  constructor() {
    this.winston = winston.createLogger({
      level: 'debug',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console(),
      ],
    });
  }

  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }

  error(message: string, meta?: any): void {
    this.winston.error(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }
}
```

### Pino Logger

```typescript
import pino from 'pino';
import { AgentLogger } from 'agente-toolkit';

class PinoAgentLogger implements AgentLogger {
  private pino: pino.Logger;

  constructor() {
    this.pino = pino({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
      },
    });
  }

  info(message: string, meta?: any): void {
    this.pino.info(meta, message);
  }

  warn(message: string, meta?: any): void {
    this.pino.warn(meta, message);
  }

  error(message: string, meta?: any): void {
    this.pino.error(meta, message);
  }

  debug(message: string, meta?: any): void {
    this.pino.debug(meta, message);
  }
}
```

## What Gets Logged

The agent system logs structured events that help you monitor:

- **Execution Lifecycle**: Start/end of agent runs with execution IDs
- **Native vs Planned Execution**: Which execution path was taken
- **Tool Execution**: Which tools were called and their results
- **Memory Operations**: When memories are added or retrieved
- **Performance Metrics**: Execution duration, response lengths
- **Error Handling**: Failed executions and fallback triggers

## Log Event Types

- `execution_start` - Agent execution begins
- `execution_complete` - Agent execution succeeds
- `execution_failed` - Agent execution fails
- `native_attempt` - Attempting native tool execution
- `native_success` - Native execution succeeded
- `fallback_triggered` - Fallback from native to planned execution
- `planned_execution_start` - Planned execution begins
- `planned_execution_success` - Planned execution succeeds

All events include structured metadata for analysis and monitoring.
