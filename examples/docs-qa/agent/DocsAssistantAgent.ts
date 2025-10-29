import { Agent } from '../../../src/core/agent/Agent';
import { AgentRegistration } from '../../../src/core/agent/types/AgentMetadata';
import { Type } from '@sinclair/typebox';
import { ingestDocumentation } from '../lib/ingest';
import { VectorStoreRetriever } from '../../../src/core/retrieval/implementations/VectorStoreRetriever';
import { InMemoryVectorStore } from '../../../src/core/retrieval/implementations/InMemoryVectorStore';
import { TransformersEmbedder } from '../../../src/core/retrieval/implementations/TransformersEmbedder';
import { RetrievedDocument } from '../../../src/core/retrieval/types/Document';

interface RetrievalResult {
  [key: string]: any;
  documents: Array<{
    content: string;
    score: number;
    source: string;
    path: string;
    heading?: string;
  }>;
  summary: string;
}

/**
 * AI Agent that uses RAG to answer questions about the agente-toolkit documentation.
 *
 * Features:
 * - Pre-prompt retrieval: Automatically retrieves relevant context before generating responses
 * - Agentic RAG: Has a `retrieve_documentation` tool for follow-up queries
 * - Citation support: Returns [n]-style references to source documents
 * - Multi-turn aware: Can retrieve additional context during conversation
 *
 * @example
 * ```typescript
 * const assistant = new DocsAssistantAgent();
 * const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);
 *
 * const answer = await assistant.run(
 *   "How do I configure RAG in this toolkit?",
 *   adapter
 * );
 * console.log(answer); // "Based on the documentation [1], you can configure..."
 * ```
 */
export class DocsAssistantAgent extends Agent {
  private retriever: VectorStoreRetriever | null = null;
  private embedder: TransformersEmbedder | null = null;
  private store: InMemoryVectorStore | null = null;
  private initialized: Promise<void>;

  protected tools = [
    {
      name: 'retrieve_documentation',
      description:
        'Search the agente-toolkit documentation for relevant information. Use this when you need more context or specific details to answer a question accurately. Returns relevant documentation snippets with citations.',
      paramsSchema: Type.Object({
        query: Type.String({
          description:
            'The search query. Be specific and use relevant technical terms from the question.',
        }),
        topK: Type.Optional(
          Type.Number({
            description:
              'Number of documents to retrieve. Default is 4. Use higher values (6-8) for complex questions.',
            minimum: 1,
            maximum: 10,
          })
        ),
        minScore: Type.Optional(
          Type.Number({
            description:
              'Minimum similarity score (0-1). Default is 0.3. Lower values return more results.',
            minimum: 0,
            maximum: 1,
          })
        ),
      }),
      action: async (params: {
        query: string;
        topK?: number | undefined;
        minScore?: number | undefined;
      }) => this.retrieve_documentation(params),
    },
  ];

  static readonly metadata: AgentRegistration = {
    metadata: {
      id: 'docs-assistant',
      name: 'Documentation Assistant',
      description: 'AI agent that answers questions about agente-toolkit using RAG',
      categories: ['documentation', 'support', 'knowledge'],
      keywords: [
        'documentation',
        'docs',
        'help',
        'how to',
        'guide',
        'tutorial',
        'reference',
        'API',
        'RAG',
        'retrieval',
        'search',
        'agente-toolkit',
      ],
      priority: 8,
      enabled: true,
    },
    capabilities: {
      taskTypes: [
        'Answer documentation questions',
        'Explain toolkit features',
        'Provide code examples',
        'Guide on best practices',
        'Search documentation',
      ],
      examples: [
        'How do I configure RAG?',
        'What is LocalEmbedder?',
        'Show me how to create an agent',
        'Explain the ManagerAgent',
        'What adapters are available?',
      ],
      limitations: [
        'Only knows about agente-toolkit documentation',
        'Cannot access external resources or APIs',
        'Requires documentation to be indexed on startup',
      ],
    },
  };

  constructor() {
    super();

    this.setPrompt(`You are a helpful AI assistant specialized in the agente-toolkit library.

Your role is to answer questions about the toolkit's features, usage, and best practices based on the official documentation.

Guidelines:
- Always cite your sources using [n] notation (e.g., "According to the documentation [1]...")
- If you're not certain about something, use the retrieve_documentation tool to search for more information
- Provide code examples when relevant
- Be concise but thorough
- If the documentation doesn't contain the answer, say so clearly

When you receive context documents, they will include:
- [n] citation numbers
- Source paths (e.g., docs/guides/building-agents.md)
- Relevance scores

Use these citations in your responses to help users find the original documentation.`);

    this.initialized = this.initializeRAG();
  }

  private async initializeRAG(): Promise<void> {
    try {
      const { embedder, store, documents } = await ingestDocumentation();

      if (documents.length === 0) {
        console.warn(
          'DocsAssistantAgent: No documentation loaded. Agent may not function properly.'
        );
        return;
      }

      this.embedder = embedder;
      this.store = store;
      this.retriever = new VectorStoreRetriever(store, 'docs-assistant-retriever');

      console.log(`DocsAssistantAgent: Initialized with ${documents.length} documentation chunks.`);
    } catch (error) {
      console.error('DocsAssistantAgent: Failed to initialize RAG:', error);
      throw error;
    }
  }

  private async retrieve_documentation(params: {
    query: string;
    topK?: number;
    minScore?: number;
  }): Promise<RetrievalResult> {
    console.log('DocsAssistantAgent: retrieve_documentation called with params:', params);
    await this.initialized;

    if (!this.retriever) {
      return {
        documents: [],
        summary: 'Documentation retrieval system not initialized.',
      };
    }

    const topK = params.topK ?? 4;
    const minScore = params.minScore ?? 0.3;

    const retrieved = await this.retriever.retrieve(params.query, {
      topK,
      minScore,
    });

    if (retrieved.length === 0) {
      return {
        documents: [],
        summary: `No relevant documentation found for query: "${params.query}". Try rephrasing or using different keywords.`,
      };
    }

    const documents = retrieved.map((doc, idx) => ({
      content: doc.content,
      score: doc.score,
      source: doc.metadata?.source || 'unknown',
      path: doc.metadata?.path || 'unknown',
      heading: doc.metadata?.heading,
    }));

    const summary = this.formatRetrievalSummary(documents);
    console.log('DocsAssistantAgent: retrieve_documentation returning documents:', summary);
    return {
      documents,
      summary,
    };
  }

  private formatRetrievalSummary(
    documents: Array<{
      content: string;
      score: number;
      source: string;
      path: string;
      heading?: string;
    }>
  ): string {
    let summary = `Retrieved ${documents.length} relevant documentation snippet(s):\n\n`;

    documents.forEach((doc, idx) => {
      const citation = idx + 1;
      const location = doc.heading ? `${doc.path} › ${doc.heading}` : doc.path;
      const preview = doc.content.slice(0, 200).trim() + (doc.content.length > 200 ? '...' : '');

      summary += `[${citation}] ${location} (score: ${doc.score.toFixed(3)})\n${preview}\n\n`;
    });

    summary +=
      'Use these citations [n] when referring to information from these documents in your response.';

    return summary;
  }

  /**
   * Override the run method to add pre-prompt retrieval
   */
  async run(userMessage: string, adapter: any): Promise<string> {
    await this.initialized;

    // Pre-prompt retrieval: Get initial context before LLM call
    if (this.retriever) {
      try {
        const initialContext = await this.retriever.retrieve(userMessage, {
          topK: 3,
          minScore: 0.35,
        });
        if (initialContext.length > 0) {
          // Inject context into the user message
          const contextText = this.formatInitialContext(initialContext);
          const augmentedMessage = `${contextText}\n\nUser question: ${userMessage}`;
          // Call parent's run method with augmented message
          return super.run(augmentedMessage, adapter);
        }
      } catch (error) {
        console.warn('DocsAssistantAgent: Pre-prompt retrieval failed:', error);
        // Continue without initial context
      }
    }

    // Fallback: run without pre-prompt context
    return super.run(userMessage, adapter);
  }

  private formatInitialContext(documents: RetrievedDocument[]): string {
    let context = 'Relevant documentation context:\n\n';

    documents.forEach((doc, idx) => {
      const citation = idx + 1;
      const location = doc.metadata?.heading
        ? `${doc.metadata.path} › ${doc.metadata.heading}`
        : doc.metadata?.path || 'unknown';

      context += `[${citation}] ${location} (score: ${doc.score.toFixed(3)})\n${doc.content}\n\n`;
    });

    return context;
  }

  getMetadata(): AgentRegistration {
    return DocsAssistantAgent.metadata;
  }
}
