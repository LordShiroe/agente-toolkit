# Agente Toolkit

A minimal TypeScript library for building AI agents with orchestration patterns (single-agent loops, manager agents, and decentralized handoffs). Includes a Claude (Anthropic) adapter and a CLI to try things quickly.

## Features

- Single-agent planning/execution with memory and tools
- Manager pattern (agents as tools) via `ManagerAgent`
- Decentralized handoffs via a registry and `handoff_to_agent` tool
- Safety guardrails: max steps, max duration, stop-on-first-error
- Structured logging with step-level timings

## Install

Clone and install deps:

```bash
npm install
npm run build
```

## CLI Quickstart

Start the chat and select an agent from the menu. Supply your Anthropic API key.

Flags:

- `--mode single|manager|decentralized` (default: `single`)
- `--max-steps <n>` safety ceiling for steps
- `--timeout-ms <ms>` safety ceiling for duration
- `--stop-on-error` stop on first tool failure
- `--model <name>` override Claude model

Examples:

Single agent (Calculator or Weather):

```bash
npm run build
node dist/cli.js chat -k $ANTHROPIC_API_KEY --mode single --max-steps 8 --timeout-ms 20000
```

Manager agent (delegates to Calculator/Weather):

```bash
npm run build
node dist/cli.js chat -k $ANTHROPIC_API_KEY --mode manager --max-steps 12
```

Decentralized (router + handoffs to peers):

```bash
npm run build
node dist/cli.js chat -k $ANTHROPIC_API_KEY --mode decentralized --timeout-ms 30000
```

## Programmatic Usage

Basic outline for creating and running an agent:

```ts
import { Agent } from './src/agent';
import { ClaudeAdapter } from './src/adapters/claudeAdapter';

const agent = new Agent();
agent.setPrompt('You are a helpful assistant.');
// agent.addTool(...)

const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY!);
const result = await agent.run('Hello!', adapter, { maxSteps: 8, stopOnFirstToolError: true });
console.log(result);
```

## Notes

- The manager and decentralized modes are basic demos intended to illustrate orchestration patterns.
- Weather functions call public APIs; ensure you have network access when using them.
- Logging is verbose in `--verbose` mode and includes prompts/responses in detail.
