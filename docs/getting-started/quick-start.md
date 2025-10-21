# Quick Start Guide

Get up and running with agente-toolkit in 5 minutes! This guide will walk you through creating your first AI agent.

## Prerequisites

- Node.js >= 18.0.0 installed
- agente-toolkit package installed (`npm install agente-toolkit`)
- An API key for Claude, OpenAI, or Ollama set up

If you haven't installed yet, see the [Installation Guide](./installation.md).

## Step 1: Create a Simple Agent

Create `my-first-agent.mjs` (ESM) or `my-first-agent.js` (CommonJS with async IIFE):

ESM (`.mjs` or `"type":"module"` in package.json):

````js
import { Agent, ClaudeAdapter } from 'agente-toolkit';

const agent = new Agent();
agent.setPrompt('You are a helpful assistant that answers questions concisely.');

const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);
# Quick Start (Essentials)

If you haven’t installed the package yet, start with the [Installation](./installation.md) guide.

## Your first agent in 60 seconds

Create `agent.mjs` (ESM) and run it with Node 18+.

```js
import { Agent, ClaudeAdapter } from 'agente-toolkit';

// 1) A tiny tool
const addTool = {
  name: 'add',
  description: 'Add two numbers',
  paramsSchema: {
    type: 'object',
    properties: { a: { type: 'number' }, b: { type: 'number' } },
    required: ['a', 'b'],
    additionalProperties: false,
  },
  action: async ({ a, b }) => a + b,
};

// 2) Adapter and agent
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);
const agent = new Agent();

// 3) Wire it up
agent.addTool(addTool);
agent.setPrompt('You are a helpful assistant.');

// 4) Run
const result = await agent.run('What is 2 + 3? Use the tool if needed.', adapter);
console.log(result);
````

Run it:

```bash
node agent.mjs
```

Notes:

- Requires ANTHROPIC_API_KEY set in your environment.
- For CommonJS, wrap the await in an async function.

## Where to go next

- Tweak runtime behavior: [Configuration](./configuration.md)
- Use a different provider or local models: [Adapters](../adapters)
- Explore multi-agent, memory, and orchestration: [Advanced Patterns](../guides/advanced-patterns.md)
  taskTypes: ['arithmetic'],
