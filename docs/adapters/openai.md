# OpenAI Adapter

Use OpenAI models with agente-toolkit.

## Quick Start

```typescript
import { Agent, OpenAIAdapter } from 'agente-toolkit';

const agent = new Agent();
const adapter = new OpenAIAdapter(
  process.env.OPENAI_API_KEY,
  'gpt-4o' // optional, default
);

const result = await agent.run('Hello OpenAI!', adapter);
console.log(result);
```

## Constructor

```ts
new OpenAIAdapter(apiKey?: string, model?: string)
```

- `apiKey` (optional): If omitted, the adapter uses `process.env.OPENAI_API_KEY`.
- `model` (optional): Defaults to `gpt-4o`.

## Notes

- The adapter does not accept an options object; use positional args.
- Supports native function calling when you add tools via `agent.addTool(...)`.
- For structured JSON output, see `complete(prompt, { json | schema })` in the API.

## Resources

- [OpenAI Documentation](https://platform.openai.com/docs)
