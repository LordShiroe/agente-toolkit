# Installation Guide

This guide covers all the different ways to install and set up agente-toolkit in your project.

## Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 (or yarn/pnpm equivalent)
- **TypeScript**: >= 4.9.0 (optional, for TypeScript projects)

# Installation

Get the package installed, set an API key, and you’re ready for the quick start.

## Requirements

- Node.js >= 18
- npm, yarn, or pnpm

## Install

```bash
npm install agente-toolkit
# or: yarn add agente-toolkit
# or: pnpm add agente-toolkit
```

## Set an API key

Use Claude (Anthropic) for the quickest path:

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

Or put it in a `.env` file and load with dotenv:

```bash
npm install dotenv
```

```js
// at the top of your entry file
import 'dotenv/config';
```

Optional providers:

- OpenAI: `export OPENAI_API_KEY="sk-..."`
- Ollama (local):
  ```bash
  ollama pull llama3.2:latest
  ollama serve
  ```

## Verify

```bash
node -e "console.log(!!process.env.ANTHROPIC_API_KEY)"
```

## Next steps

- Build your first agent: [Quick Start](./quick-start.md)
- Tweak runtime behavior: [Configuration](./configuration.md)
- Learn to build custom agents: [Building Agents](../guides/building-agents.md)
- Troubleshoot setup: [Troubleshooting](../troubleshooting.md)
- Browse the API: [API Overview](../api/overview.md)
