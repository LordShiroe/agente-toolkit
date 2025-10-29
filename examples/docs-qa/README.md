# DocsAssistantAgent Example

A RAG-powered AI agent that answers questions about the agente-toolkit documentation.

## Features

✅ **Auto-discovery**: Automatically finds and indexes all markdown documentation  
✅ **Hybrid RAG**: Pre-prompt retrieval + agentic tool for follow-up queries  
✅ **Intelligent reasoning**: Agent decides when to retrieve more context  
✅ **Citation support**: Automatic [n]-style references in responses  
✅ **Multi-turn aware**: Can handle follow-up questions with context  
✅ **OpenAI-powered**: Uses GPT-4 mini by default

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key

### Installation

```bash
npm install
```

### Run the Example

**Demo mode** (runs sample questions):

```bash
OPENAI_API_KEY=sk-... npx tsx examples/docs-qa
```

**Ask a specific question**:

```bash
OPENAI_API_KEY=sk-... npx tsx examples/docs-qa --question "How do I configure RAG?"
```

````

## How It Works

The `DocsAssistantAgent`:

1. **Pre-prompt retrieval**: Automatically retrieves 3 most relevant docs before generating response
2. **Agentic RAG**: Has a `retrieve_documentation` tool it can call for additional context
3. **Citation formatting**: Includes [n] references to source documents
4. **Conversational**: Maintains context across messages

### Example

```typescript
import { DocsAssistantAgent } from './examples/docs-qa/agent/DocsAssistantAgent';
import { OpenAIAdapter } from 'agente-toolkit';

const agent = new DocsAssistantAgent();
const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);

// Agent automatically retrieves relevant docs and responds with citations
const answer = await agent.run('How do I use TransformersEmbedder with custom models?', adapter);
// → "Based on the documentation [1], TransformersEmbedder accepts a model parameter..."
````

## Project Structure

```
examples/docs-qa/
├── index.ts              # Main entrypoint (thin shell)
├── agent/
│   └── DocsAssistantAgent.ts   # RAG-powered agent class
└── lib/
    ├── ingest.ts        # Documentation ingestion & chunking
    ├── adapters.ts      # LLM adapter factory
    ├── cli.ts           # CLI argument parser (commander)
    └── runner.ts        # Demo and question runners
```

## CLI Options

```
-q, --question <text>   Question to ask (if omitted, runs demo questions)
```

## How Ingestion Works

The `ingest.ts` module uses **automatic markdown discovery**:

1. **Auto-discovers documentation**: Scans the entire repository for `.md` files
2. **Smart filtering**: Excludes `node_modules`, `coverage`, meta files (CHANGELOG, etc.)
3. **Auto-categorization**: Groups files by path:
   - `README.md` → `readme`
   - `docs/guides/*.md` → `guide`
   - `docs/api/*.md` → `api`
   - `docs/adapters/*.md` → `adapter`
   - `docs/getting-started/*.md` → `getting-started`
4. **Chunks by headings**: Splits documents at heading boundaries (~600 chars per chunk)
5. **Embeds locally**: Uses `TransformersEmbedder` (Transformers.js WASM) for semantic embeddings
6. **Stores in memory**: Indexes in `InMemoryVectorStore` for fast retrieval

### Auto-Discovered Sources (17 files)

The agent automatically indexes:

- `README.md`
- `docs/guides/` (5 files: building-agents, rag-integration, tool-development, LOGGING, advanced-patterns)
- `docs/api/` (1 file: overview)
- `docs/adapters/` (3 files: claude, ollama, openai)
- `docs/getting-started/` (3 files: installation, configuration, quick-start)
- `examples/README.md`
- `examples/customer-support/README.md`
- `examples/docs-qa/README.md`

**Total**: ~334 chunks from all documentation

## Troubleshooting

### No results found

Try lowering the similarity threshold or retrieving more candidates:

```bash
npx tsx examples/docs-qa --question "your question"
```

The agent will automatically adjust thresholds if initial retrieval returns no results.

### Slow first run

The embedder model (~20MB) is downloaded on first use. Subsequent runs are faster with cached model.

### API key not set

Make sure to set `OPENAI_API_KEY` environment variable:

```bash
export OPENAI_API_KEY=sk-...
npx tsx examples/docs-qa --question "How do I get started?"
```

Or customize the model:

```bash
OPENAI_MODEL=gpt-4 npx tsx examples/docs-qa
```
