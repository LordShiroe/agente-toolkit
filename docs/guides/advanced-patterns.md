# Advanced Patterns

This page collects advanced usage patterns so the core guides can stay short.

## Multi-Agent Orchestration

- Register agents with `registerAgent(name, agent, metadata)`.
- Use `ManagerAgent(adapter)` to route requests.
- Prefer small, focused agents; use keywords/examples in metadata.

Example (abridged):

```ts
import { registerAgent, ManagerAgent, ClaudeAdapter } from 'agente-toolkit';

registerAgent('calculator', new CalculatorAgent(), CalculatorAgent.metadata);
registerAgent('weather', new WeatherAgent(), WeatherAgent.metadata);

const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);
const manager = new ManagerAgent(adapter);
const result = await manager.run('What is 15 + 27?', adapter);
```

## Advanced Tool Patterns

- External API calls (retry/backoff)
- File system operations (path sanitization)
- Stateful tools (caches, stores)
- Streaming/large-file processing

Guidelines:

- Validate params strictly with TypeBox.
- Always return strings or JSON-stringify.
- Add timeouts and resource limits.

## Error Handling Strategies

- Wrap external calls in try/catch.
- Normalize error strings for the model.
- Prefer user-friendly messages.

## Performance Tips

- Use smaller models for simple tasks (Ollama/local).
- Reduce memory window size.
- Keep tool schemas minimal.

## Testing Tools

- Unit-test tool `action` functions with representative params.
- Validate schema with malformed inputs.

---

See also: [Building Agents](./building-agents.md) · [Tool Development](./tool-development.md)
