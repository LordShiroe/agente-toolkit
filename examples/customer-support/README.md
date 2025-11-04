# Multi-Agent Customer Support System

A demonstration of the **globalSourceRegistry** pattern with multiple specialized AI agents sharing common knowledge sources.

## Overview

This example shows a realistic customer support system with:

- **3 specialized agents**: Product Support, Billing Support, Returns Support
- **4 shared knowledge sources**: Product Docs, FAQ, Billing KB, Returns Policy
- **Automatic routing**: Manager agent routes questions to the right specialist
- **Centralized source management**: All sources registered once, reused by all agents

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Global Source Registry                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐     │
│  │  Product   │ │    FAQ     │ │  Billing   │     │
│  │   Docs     │ │  Database  │ │     KB     │ ... │
│  └────────────┘ └────────────┘ └────────────┘     │
└─────────────────────────────────────────────────────┘
         ↑              ↑              ↑
         │              │              │
    ┌────┴──────┬───────┴────────┬─────┴──────┐
    │           │                │            │
┌───┴───┐  ┌───┴────┐  ┌────────┴──┐  ┌──────┴──┐
│Product│  │Billing │  │  Returns  │  │ Manager │
│Support│  │Support │  │   Agent   │  │  Agent  │
└───────┘  └────────┘  └───────────┘  └─────────┘
```

### Agents and Their Sources

| Agent               | Uses Sources        | Specializes In                           |
| ------------------- | ------------------- | ---------------------------------------- |
| **Product Support** | product-docs, faq   | Technical issues, setup, troubleshooting |
| **Billing Support** | billing-kb, faq     | Payments, subscriptions, invoices        |
| **Returns Support** | returns-policy, faq | Returns, refunds, exchanges              |
| **Manager**         | (none)              | Routes to appropriate specialist         |

## Key Benefits of globalSourceRegistry

✅ **Source Reusability**: FAQ source is shared by all three specialist agents  
✅ **Centralized Management**: Register sources once at startup  
✅ **Easy Configuration**: Agents reference sources by ID, not implementation  
✅ **Automatic RAG**: ExecutionEngine handles retrieval, no manual augmentation  
✅ **Scalable**: Add new agents or sources without touching existing code

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key

### Installation

```bash
npm install
```

### Run the Example

**Demo mode** (runs 3 sample questions):

```bash
OPENAI_API_KEY=sk-... npx tsx examples/customer-support
```

**Ask a specific question**:

```bash
OPENAI_API_KEY=sk-... npx tsx examples/customer-support "How do I reset my hub?"
```

**Route to specific agent**:

```bash
# Force routing to product support
OPENAI_API_KEY=sk-... npx tsx examples/customer-support "Why was I charged?" --agent product

# Use billing support
OPENAI_API_KEY=sk-... npx tsx examples/customer-support "Can I pause my subscription?" --agent billing

# Use returns support
OPENAI_API_KEY=sk-... npx tsx examples/customer-support "How do I return this?" --agent returns
```

**Show help**:

```bash
npx tsx examples/customer-support --help
```

## How It Works

### 1. Source Registration (lib/sources.ts)

All knowledge sources are registered **once** at startup:

```typescript
import { globalSourceRegistry } from 'agente-toolkit';

// Register product docs
const { store: productStore } = await ingestProductDocs();
const productRetriever = new VectorStoreRetriever(productStore, 'product-docs-retriever');
globalSourceRegistry.register(
  {
    id: 'product-docs',
    name: 'Product Documentation',
    topK: 5,
    minScore: 0.3,
  },
  productRetriever
);

// Register FAQ (shared by all agents)
const { store: faqStore } = await ingestFAQ();
const faqRetriever = new VectorStoreRetriever(faqStore, 'faq-retriever');
globalSourceRegistry.register(
  {
    id: 'faq',
    name: 'FAQ Database',
    topK: 3,
    minScore: 0.4,
  },
  faqRetriever
);

// ... billing-kb, returns-policy ...
```

### 2. Agent Configuration (agents/ProductSupportAgent.ts)

Agents reference sources **by ID**:

```typescript
export class ProductSupportAgent extends Agent {
  constructor() {
    // Pass global registry to agent
    super(undefined, undefined, globalSourceRegistry);

    this.setPrompt(`You are a product support specialist...`);

    // Configure which sources this agent uses
    this.setRetrievalConfig({
      sources: ['product-docs', 'faq'], // Reference by ID!
      maxDocuments: 6,
      deduplicate: true,
    });
  }
}
```

### 3. Automatic Retrieval

When the agent runs:

1. **ExecutionEngine** sees the agent has `retrievalConfig`
2. **RetrievalAugmentor** looks up source IDs in `globalSourceRegistry`
3. Retrieves documents from both `product-docs` and `faq` sources
4. Merges, ranks, and deduplicates results
5. Injects context into prompt automatically
6. Agent responds with cited sources

**No manual RAG code needed in the agent!**

### 4. Manager Routing

The Manager agent analyzes questions and routes to specialists:

```typescript
// Keyword-based routing (production could use LLM classification)
if (message.includes('return') || message.includes('refund')) {
  specialist = this.returnsAgent;
} else if (message.includes('bill') || message.includes('payment')) {
  specialist = this.billingAgent;
} else {
  specialist = this.productAgent; // Default
}

return await specialist.run(message, model);
```

## Project Structure

```
examples/customer-support/
├── index.ts              # Main entrypoint
├── agents/
│   ├── ProductSupportAgent.ts   # Technical support specialist
│   ├── BillingSupportAgent.ts   # Billing specialist
│   ├── ReturnsAgent.ts          # Returns specialist
│   └── ManagerAgent.ts          # Auto-routing manager
└── lib/
    ├── data.ts          # Fake knowledge source content
    ├── ingest.ts        # Document chunking and embedding
    ├── sources.ts       # Global source registration
    ├── adapters.ts      # LLM adapter factory
    └── cli.ts           # CLI argument parser
```

## Example Interactions

### Product Question

```bash
$ OPENAI_API_KEY=sk-... npx tsx examples/customer-support "My smart light won't pair"

🎧 SmartHome Hub - Customer Support System

🔧 Setting up global retrieval sources...
  📦 Ingesting product documentation...
     ✓ Loaded 15 product doc chunks
  ❓ Ingesting FAQ database...
     ✓ Loaded 12 FAQ chunks
  💳 Ingesting billing knowledge base...
     ✓ Loaded 18 billing KB chunks
  ↩️  Ingesting returns policy...
     ✓ Loaded 16 returns policy chunks

✅ Registered 4 sources: product-docs, faq, billing-kb, returns-policy

📝 Question: My smart light won't pair
────────────────────────────────────────────────────────────────────────────────
  → Routing to: Product Support Specialist

💡 Answer:
I can help you with pairing your smart light! Here are the steps [1]:

1. Open the SmartHome app and navigate to Devices
2. Tap the + button and select "Smart Light"
3. Put your light in pairing mode by turning it on/off 3 times
4. The hub will automatically discover and connect to the light
5. Give your light a name and assign it to a room

If that doesn't work, try these troubleshooting steps [2]:
- Ensure the light is within 50 feet of your hub
- Check that the hub is connected to your network
- Try moving the light closer to the hub temporarily during pairing
- Make sure you're using a 2.4GHz WiFi network (5GHz is not supported)

⏱️  Response time: 3245ms
────────────────────────────────────────────────────────────────────────────────
```

### Billing Question

```bash
$ npx tsx examples/customer-support "Why was I charged twice?"

  → Routing to: Billing Specialist

💡 Answer:
I understand your concern about the duplicate charge. Let me explain [1]:

Duplicate charges are typically authorization holds that appear temporarily.
Here's what to expect:
- Authorization holds usually drop within 48 hours
- Only one actual charge will process
- If both charges remain after 48 hours, contact our billing team

To verify:
1. Log into your account
2. Go to Settings > Billing History
3. Check if one shows as "Pending" vs "Completed"

If the issue persists after 48 hours, please contact billing support with
your transaction details at billing@smarthomehub.com [2].

For future reference, you can view all invoices in Account > Billing History [3].
```

### Returns Question

```bash
$ npx tsx examples/customer-support "I received a damaged product"

  → Routing to: Returns Specialist

💡 Answer:
I'm sorry to hear your product arrived damaged. We'll take care of this quickly [1]:

For products damaged during shipping:
1. No need to return the damaged item
2. Report within 48 hours of delivery (you're good!)
3. Provide photos of the package and product damage
4. Replacement will be shipped immediately at no charge

To proceed:
- Contact support with your order number
- Attach photos showing the damage
- We'll expedite a replacement (typically ships within 24 hours)

This is covered under our shipping damage policy, so there's no cost to you [2].

Would you like me to help you initiate the replacement process?
```

## Comparison: With vs Without Registry

### Without Registry (Manual RAG)

```typescript
class ProductAgent extends Agent {
  private retriever: VectorStoreRetriever;

  constructor() {
    super();
    // Each agent sets up its own retrievers
    const store = await ingestProductDocs();
    this.retriever = new VectorStoreRetriever(store);
  }

  async run(message: string, adapter: any) {
    // Manual retrieval
    const docs = await this.retriever.retrieve(message);
    const augmented = this.composePrompt(message, docs);
    return super.run(augmented, adapter);
  }
}
```

**Problems:**

- Duplication: Each agent sets up retrievers
- No sharing: Can't reuse sources across agents
- Manual: Have to implement RAG in every agent
- Scattered: Source config lives in agent classes

### With Registry (This Example)

```typescript
// Setup once
globalSourceRegistry.register({ id: 'product-docs', ... }, retriever);

class ProductAgent extends Agent {
  constructor() {
    super(undefined, undefined, globalSourceRegistry);
    this.setRetrievalConfig({ sources: ['product-docs'] });
  }
  // That's it! ExecutionEngine handles RAG automatically
}
```

**Benefits:**

- Centralized: Register sources once
- Reusable: Multiple agents share sources
- Automatic: ExecutionEngine handles RAG
- Clean: Agents are simple and focused

## Extending the Example

### Add a New Knowledge Source

1. **Add data** (lib/data.ts):

```typescript
export const WARRANTY_INFO = `...warranty details...`;
```

2. **Add ingestion** (lib/ingest.ts):

```typescript
export async function ingestWarrantyInfo(): Promise<IngestResult> {
  const documents = chunkText(WARRANTY_INFO, 'warranty', 500);
  // ...
}
```

3. **Register source** (lib/sources.ts):

```typescript
const { store } = await ingestWarrantyInfo();
globalSourceRegistry.register({ id: 'warranty', ... }, retriever);
```

4. **Use in agent**:

```typescript
this.setRetrievalConfig({
  sources: ['product-docs', 'faq', 'warranty'], // Add warranty!
});
```

### Add a New Agent

```typescript
export class WarrantyAgent extends Agent {
  constructor() {
    super(undefined, undefined, globalSourceRegistry);
    this.setPrompt(`You are a warranty specialist...`);
    this.setRetrievalConfig({
      sources: ['warranty', 'returns-policy', 'faq'],
    });
  }
}
```

## Troubleshooting

### Sources not found

Make sure `setupGlobalSources()` completes before creating agents.

### Wrong agent selected

Adjust routing logic in `ManagerAgent.run()` or use `--agent` flag to force routing.

### Slow first run

The embedder model (~20MB) downloads on first use. Subsequent runs are faster.

## Next Steps

- Add more specialized agents (Technical Support, Sales, Account Management)
- Implement LLM-based routing instead of keyword matching
- Add conversation history and context
- Integrate with production vector databases (pgvector, Qdrant, Weaviate)
- Add analytics and routing metrics

## Learn More

- See `docs/guides/rag-integration.md` for RAG architecture details
- See `examples/docs-qa/` for a simpler single-agent RAG example
- See `src/core/retrieval/SourceRegistry.ts` for registry implementation

---

**This example demonstrates why `globalSourceRegistry` exists**: to enable clean, scalable multi-agent systems with shared knowledge sources! 🚀
