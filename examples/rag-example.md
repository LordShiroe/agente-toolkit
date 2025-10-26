# RAG (Retrieval-Augmented Generation) Example

This example demonstrates how to configure and use the RAG system to augment agent responses with external knowledge.

## Setup

```typescript
import {
  Agent,
  LocalEmbedder,
  InMemoryVectorStore,
  VectorStoreRetriever,
  SourceRegistry,
  globalSourceRegistry,
  ClaudeAdapter,
} from 'agente-toolkit';
import type { Document, SourceConfig, RetrievalConfig } from 'agente-toolkit';

// 1. Create an embedder (LocalEmbedder uses Transformers.js locally - no API keys needed)
const embedder = new LocalEmbedder();

// 2. Create a vector store and populate it with documents
const vectorStore = new InMemoryVectorStore(embedder);

const documents: Document[] = [
  {
    id: 'doc-1',
    content: 'Paris is the capital of France. It is known for the Eiffel Tower.',
    metadata: { category: 'geography', country: 'France' },
  },
  {
    id: 'doc-2',
    content: 'The Eiffel Tower was built in 1889 for the World Expo.',
    metadata: { category: 'landmarks', country: 'France' },
  },
  {
    id: 'doc-3',
    content: 'Berlin is the capital of Germany. The Berlin Wall fell in 1989.',
    metadata: { category: 'geography', country: 'Germany' },
  },
];

await vectorStore.upsert(documents);

// 3. Create a retriever
const retriever = new VectorStoreRetriever(vectorStore, 'geography-retriever');

// 4. Register the source
const sourceConfig: SourceConfig = {
  id: 'geography-kb',
  name: 'Geography Knowledge Base',
  description: 'Facts about cities and landmarks',
  topK: 3,
  minScore: 0.5,
};

globalSourceRegistry.register(sourceConfig, retriever);

// 5. Create an agent with retrieval enabled
const agent = new Agent(undefined, undefined, globalSourceRegistry);

agent.setPrompt(
  'You are a knowledgeable geography assistant. Use the provided context to answer questions accurately.'
);

// 6. Configure retrieval for this agent
const retrievalConfig: RetrievalConfig = {
  sources: ['geography-kb'],
  maxDocuments: 3,
  deduplicate: true,
};

agent.setRetrievalConfig(retrievalConfig);

// 7. Run the agent - it will automatically retrieve relevant context
const model = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY!);
const response = await agent.run('Tell me about Paris', model);

console.log(response);
// The agent now has access to retrieved documents about Paris
```

## Using Multiple Sources

You can configure multiple retrieval sources for different knowledge domains:

```typescript
// Product documentation source
const productVectorStore = new InMemoryVectorStore(embedder);
await productVectorStore.upsert([
  { id: 'p1', content: 'Our premium plan includes 24/7 support...' },
  { id: 'p2', content: 'The basic plan starts at $9.99/month...' },
]);

globalSourceRegistry.register(
  { id: 'product-docs', name: 'Product Docs', topK: 5 },
  new VectorStoreRetriever(productVectorStore)
);

// FAQ source
const faqVectorStore = new InMemoryVectorStore(embedder);
await faqVectorStore.upsert([{ id: 'f1', content: 'Q: How do I reset my password? A: Click...' }]);

globalSourceRegistry.register(
  { id: 'faq', name: 'FAQ', topK: 3 },
  new VectorStoreRetriever(faqVectorStore)
);

// Configure agent to use both sources
agent.setRetrievalConfig({
  sources: ['product-docs', 'faq'],
  maxDocuments: 5,
  deduplicate: true,
});
```

## Per-Agent Configuration

You can configure different retrieval sources for different agents:

```typescript
import { registerAgent } from 'agente-toolkit';

const supportAgent = new Agent(undefined, undefined, globalSourceRegistry);
supportAgent.setRetrievalConfig({
  sources: ['product-docs', 'faq'],
  maxDocuments: 5,
});

registerAgent('support', supportAgent, {
  metadata: {
    id: 'support',
    name: 'Support Agent',
    description: 'Handles customer support queries',
    categories: ['support'],
    keywords: ['help', 'support', 'question'],
  },
  capabilities: {
    taskTypes: ['support', 'faq'],
    examples: ['How do I reset my password?'],
  },
  retrieval: {
    sources: ['product-docs', 'faq'],
    maxDocuments: 5,
  },
});

const salesAgent = new Agent(undefined, undefined, globalSourceRegistry);
salesAgent.setRetrievalConfig({
  sources: ['product-docs', 'pricing'],
  maxDocuments: 3,
});

registerAgent('sales', salesAgent, {
  metadata: {
    id: 'sales',
    name: 'Sales Agent',
    description: 'Answers product and pricing questions',
    categories: ['sales'],
    keywords: ['pricing', 'features', 'plan'],
  },
  capabilities: {
    taskTypes: ['sales', 'product-info'],
    examples: ['What features are included in the premium plan?'],
  },
  retrieval: {
    sources: ['product-docs', 'pricing'],
    maxDocuments: 3,
  },
});
```

## Using with Real Embeddings

For production use, replace `LocalEmbedder` with a real embedding service:

```typescript
import OpenAI from 'openai';

class OpenAIEmbedder implements Embedder {
  name = 'openai-embedder';
  dimension = 1536;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts,
    });
    return response.data.map(d => d.embedding);
  }
}

const realEmbedder = new OpenAIEmbedder(process.env.OPENAI_API_KEY!);
const vectorStore = new InMemoryVectorStore(realEmbedder);
```

## Notes

- The `LocalEmbedder` uses Transformers.js for real semantic embeddings running completely locally. For production at scale, consider using API-based embedders (OpenAI, Cohere, Voyage) for higher quality and performance.
- The `InMemoryVectorStore` is simple but not suitable for large datasets. Consider using pgvector, Qdrant, Chroma, or similar for production.
- Retrieval is completely optional - agents work normally without it.
- The system is LLM-agnostic - retrieval augmentation works with Claude, OpenAI, Ollama, or any other adapter.
