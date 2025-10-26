# Retrieval-Augmented Generation (RAG) in AiNoob

## Overview

The AiNoob toolkit includes a modular RAG system that allows agents to augment their responses with external knowledge retrieved from configured sources. The system is:

- **LLM-agnostic**: Works with Claude, OpenAI, Ollama, or any ModelAdapter
- **Optional**: Agents function normally without retrieval configuration
- **Pluggable**: Swap vector stores, embedders, and retrievers without changing agent code
- **Declarative**: Configure sources per-agent through simple IDs

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│ Agent                                                   │
│  ├─ retrievalConfig (optional)                         │
│  └─ ExecutionEngine                                    │
│      └─ RetrievalAugmentor (if configured)            │
│          ├─ SourceRegistry (maps source IDs)          │
│          │   └─ Retrievers                            │
│          │       └─ VectorStore + Embedder            │
│          └─ PromptComposer                            │
└─────────────────────────────────────────────────────────┘
```

### Interfaces

- **`Embedder`**: Converts text to vectors (`embed(text) → vector`)
- **`VectorStore`**: Stores and queries documents by similarity (`upsert`, `query`, `delete`)
- **`Retriever`**: High-level document retrieval (`retrieve(query, options) → documents`)
- **`PromptComposer`**: Injects retrieved context into prompts

### Provided Implementations

- **`LocalEmbedder`**: Local embedder using Transformers.js with WASM backend (works everywhere without native bindings)
- **`InMemoryVectorStore`**: Simple cosine-similarity store (not for production scale)
- **`VectorStoreRetriever`**: Wraps a VectorStore
- **`DefaultPromptComposer`**: Formats documents into a "Retrieved context" section

## Integration Points

### 1. ExecutionEngine

When an agent has a `retrievalConfig`, the `ExecutionEngine._buildPrompt` method:

1. Calls `RetrievalAugmentor.augment(message, retrievalConfig, systemPrompt)`
2. Receives an augmented prompt with injected context
3. Merges memory context
4. Passes the final prompt to the LLM adapter

### 2. Agent Configuration

Agents can set retrieval config programmatically:

```typescript
agent.setRetrievalConfig({
  sources: ['knowledge-base', 'faq'],
  maxDocuments: 5,
  deduplicate: true,
});
```

Or via the registry:

```typescript
registerAgent('support', supportAgent, {
  metadata: { ... },
  capabilities: { ... },
  retrieval: {
    sources: ['product-docs'],
    maxDocuments: 3,
  },
});
```

### 3. Source Registry

The global `SourceRegistry` (or a custom instance) maps source IDs to retrievers:

```typescript
import { globalSourceRegistry } from 'agente-toolkit';

globalSourceRegistry.register(
  {
    id: 'knowledge-base',
    name: 'Company Knowledge Base',
    topK: 5,
    minScore: 0.7,
  },
  myRetriever
);
```

When creating an `Agent`, pass the registry:

```typescript
const agent = new Agent(memoryManager, logger, globalSourceRegistry);
```

The `ExecutionEngine` will use it to resolve source IDs.

## Extending the System

### Custom Embedder

```typescript
import { Embedder } from 'agente-toolkit';
import OpenAI from 'openai';

class OpenAIEmbedder implements Embedder {
  name = 'openai';
  dimension = 1536;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async embed(text: string): Promise<number[]> {
    const { data } = await this.client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const { data } = await this.client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts,
    });
    return data.map(d => d.embedding);
  }
}
```

### Custom VectorStore (e.g., pgvector)

```typescript
import { VectorStore, VectorQuery, Document } from 'agente-toolkit';
import { Pool } from 'pg';

class PgVectorStore implements VectorStore {
  name = 'pgvector';
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async upsert(documents: Document[]): Promise<void> {
    // INSERT INTO documents (id, content, embedding, metadata) VALUES ...
  }

  async query(query: VectorQuery): Promise<Array<Document & { score: number }>> {
    // SELECT *, embedding <=> $1 AS score FROM documents ORDER BY score LIMIT $2
  }

  // ... delete, clear
}
```

### Custom Retriever (hybrid search)

```typescript
import { Retriever, RetrieveOptions, RetrievedDocument } from 'agente-toolkit';

class HybridRetriever implements Retriever {
  name = 'hybrid';
  private vectorRetriever: Retriever;
  private keywordRetriever: Retriever;

  async retrieve(query: string, options?: RetrieveOptions): Promise<RetrievedDocument[]> {
    const [vectorDocs, keywordDocs] = await Promise.all([
      this.vectorRetriever.retrieve(query, options),
      this.keywordRetriever.retrieve(query, options),
    ]);

    // Merge and rerank using RRF or similar
    return this.mergeResults(vectorDocs, keywordDocs);
  }

  private mergeResults(a: RetrievedDocument[], b: RetrievedDocument[]): RetrievedDocument[] {
    // Reciprocal Rank Fusion or other hybrid strategy
  }
}
```

## Best Practices

1. **Use real embedders in production**: `LocalEmbedder` uses Transformers.js locally (free, no API keys), but for production at scale consider API-based embedders (OpenAI, Cohere, Voyage) for better quality and performance.
2. **Choose appropriate vector stores**: `InMemoryVectorStore` is fine for small datasets; use pgvector, Qdrant, Chroma, etc. for scale.
3. **Configure per-agent sources**: Different agents should retrieve from different knowledge bases (support vs sales vs engineering).
4. **Set sensible `topK` and `minScore`**: Balance context size with relevance.
5. **Enable deduplication** if sources overlap.
6. **Monitor retrieval quality**: Log retrieved documents and scores to tune thresholds.
7. **Batch embed when possible**: Use `embedBatch` for performance.

## Future Enhancements

- **Rerankers**: Add a reranker interface to refine top-k results.
- **Metadata filtering**: Already supported in `VectorQuery.filters`.
- **Hybrid retrieval**: Combine vector and keyword search.
- **Async ingestion**: Background jobs to index documents.
- **Adapters for popular libs**: LangChain.js, LlamaIndex.TS connectors.

## References

- See `examples/rag-example.md` for complete usage examples
- Tests: `tests/unit/retrieval/`
- Core code: `src/core/retrieval/`
