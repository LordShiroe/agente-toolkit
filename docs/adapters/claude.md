# Claude Adapter

How to use Anthropic's Claude with agente-toolkit.

## Quick Start

```typescript
import { Agent, ClaudeAdapter } from 'agente-toolkit';

const agent = new Agent();
const adapter = new ClaudeAdapter(
  process.env.ANTHROPIC_API_KEY,
  'claude-sonnet-4-20250514' // optional, this is the default
);

const result = await agent.run('Hello Claude!', adapter);
console.log(result);
```

## Constructor

```ts
new ClaudeAdapter(apiKey?: string, model?: string)
```

- `apiKey` (optional): If omitted, the adapter uses `process.env.ANTHROPIC_API_KEY`.
- `model` (optional): Defaults to `claude-sonnet-4-20250514`.

## Supported Models (examples)

- `claude-sonnet-4-20250514` (default)
- `claude-3-5-sonnet-20241022`
- `claude-3-haiku-20240307`

Use models available to your Anthropic account and region.

## Notes

- The adapter does not accept an options object. Pass `apiKey` and `model` as positional arguments.
- Native tool calling is supported; the agent will use tools you add via `agent.addTool(...)`.
- For rate limits and retry patterns, see [Troubleshooting](../troubleshooting.md).

## Resources

- [Anthropic Documentation](https://docs.anthropic.com/)
