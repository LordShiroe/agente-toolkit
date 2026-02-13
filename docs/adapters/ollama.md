# Ollama Adapter

Run agents locally with models served by Ollama.

## Quick Start

```typescript
import { Agent, OllamaAdapter } from 'agente-toolkit';

const agent = new Agent();
const adapter = new OllamaAdapter(
  'http://localhost:11434',
  'llama3.2:latest' // optional, default
);

const result = await agent.run('Hello locally!', adapter);
console.log(result);
```

## Constructor

```ts
new OllamaAdapter(
  baseUrl?: string,
  model?: string,
  options?: {
    headers?: Record<string, string>;
    authToken?: string;
    authHeaderName?: string;
    authScheme?: string;
  }
)
```

- `baseUrl` (optional): Defaults to `http://localhost:11434`.
- `model` (optional): Defaults to `llama3.2:latest`.
- `options.headers` (optional): Extra headers for every request (useful behind reverse proxies).
- `options.authToken` (optional): Token for proxy auth.
- `options.authHeaderName` (optional): Auth header name (default: `Authorization`).
- `options.authScheme` (optional): Prefix before token (default: `Bearer `, set `''` for raw token).

## Reverse Proxy Example

```ts
const adapter = new OllamaAdapter('https://llm.example.com/ollama', 'llama3.2:latest', {
  authToken: process.env.OLLAMA_PROXY_TOKEN,
  headers: {
    'X-Tenant-Id': 'team-a',
  },
});
```

## Setup

1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull llama3.2:latest`
3. Ensure the Ollama service is running (installer starts it automatically)

## Notes

- Native function calling is supported when tools are added to your agent.
- For JSON output, use `complete(prompt, { json | schema })`.

## Resources

- [Ollama Documentation](https://ollama.ai)
- [Model Library](https://ollama.ai/library)
