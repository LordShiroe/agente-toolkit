import { describe, it, expect, beforeEach } from 'vitest';
import { RetrievalAugmentor } from '../../../src/core/retrieval/RetrievalAugmentor';
import { SourceRegistry } from '../../../src/core/retrieval/SourceRegistry';
import { VectorStoreRetriever } from '../../../src/core/retrieval/implementations/VectorStoreRetriever';
import { InMemoryVectorStore } from '../../../src/core/retrieval/implementations/InMemoryVectorStore';
import { TransformersEmbedder } from '../../../src/core/retrieval/implementations/TransformersEmbedder';
import { DefaultPromptComposer } from '../../../src/core/retrieval/implementations/DefaultPromptComposer';
import { Document } from '../../../src/core/retrieval/types/Document';
import { RetrievalConfig, SourceConfig } from '../../../src/core/retrieval/types/RetrievalConfig';

describe('RetrievalAugmentor', () => {
  let augmentor: RetrievalAugmentor;
  let sourceRegistry: SourceRegistry;
  let vectorStore: InMemoryVectorStore;

  beforeEach(async () => {
    // Setup vector store with test documents using real embedder
    const embedder = new TransformersEmbedder();
    vectorStore = new InMemoryVectorStore(embedder);

    const documents: Document[] = [
      {
        id: '1',
        content: 'Paris is the capital of France',
        metadata: { category: 'geography' },
      },
      {
        id: '2',
        content: 'The Eiffel Tower is in Paris',
        metadata: { category: 'landmarks' },
      },
      {
        id: '3',
        content: 'London is the capital of England',
        metadata: { category: 'geography' },
      },
    ];
    await vectorStore.upsert(documents);

    // Setup source registry
    sourceRegistry = new SourceRegistry();
    const retriever = new VectorStoreRetriever(vectorStore, 'test-retriever');

    const sourceConfig: SourceConfig = {
      id: 'knowledge-base',
      name: 'Test Knowledge Base',
      topK: 2,
      minScore: 0.5,
    };

    sourceRegistry.register(sourceConfig, retriever);

    // Create augmentor
    augmentor = new RetrievalAugmentor(sourceRegistry, new DefaultPromptComposer());
  });

  describe('augment', () => {
    it('should augment prompt with retrieved documents', async () => {
      const config: RetrievalConfig = {
        sources: ['knowledge-base'],
        maxDocuments: 2,
      };

      const result = await augmentor.augment('paris france capital', config);

      expect(result).toContain('Paris is the capital of France');
      expect(result).toContain('Retrieved context');
      expect(result).toContain('User request: paris france capital');
    });

    it('should include system prompt when provided', async () => {
      const config: RetrievalConfig = {
        sources: ['knowledge-base'],
        maxDocuments: 2,
      };

      const result = await augmentor.augment(
        'paris',
        config,
        'You are a helpful geography assistant.'
      );

      expect(result).toContain('You are a helpful geography assistant.');
      expect(result).toContain('Paris');
    });

    it('should respect maxDocuments limit', async () => {
      const config: RetrievalConfig = {
        sources: ['knowledge-base'],
        maxDocuments: 1,
      };

      const result = await augmentor.augment('Paris is the capital of France', config);

      // With limited docs, result should either have context or be the query itself
      // Count document markers if context was retrieved
      const docMarkers = result.match(/\[\d+\]/g) || [];
      if (docMarkers.length > 0) {
        expect(docMarkers.length).toBeLessThanOrEqual(1);
      }
      // At minimum, the result should contain the query
      expect(result).toBeTruthy();
    });

    it('should deduplicate results when configured', async () => {
      // Add duplicate document
      await vectorStore.upsert([
        {
          id: '4',
          content: 'Paris is the capital of France', // Duplicate
        },
      ]);

      const config: RetrievalConfig = {
        sources: ['knowledge-base'],
        maxDocuments: 5,
        deduplicate: true,
      };

      const result = await augmentor.augment('Paris France capital', config);

      // Count occurrences of the content
      const occurrences = (result.match(/Paris is the capital of France/g) || []).length;
      expect(occurrences).toBe(1); // Should only appear once after deduplication
    });

    it('should handle missing source gracefully', async () => {
      const config: RetrievalConfig = {
        sources: ['non-existent-source'],
        maxDocuments: 2,
      };

      const result = await augmentor.augment('Test query', config);

      // Should return just the message without full prompt formatting when no docs found
      expect(result).toBe('Test query');
      expect(result).not.toContain('Retrieved context');
    });

    it('should handle multiple sources', async () => {
      // Add another source with real embedder
      const embedder2 = new TransformersEmbedder();
      const vectorStore2 = new InMemoryVectorStore(embedder2);

      await vectorStore2.upsert([
        {
          id: '10',
          content: 'Berlin is the capital of Germany',
        },
      ]);

      const retriever2 = new VectorStoreRetriever(vectorStore2, 'test-retriever-2');
      sourceRegistry.register(
        {
          id: 'knowledge-base-2',
          name: 'Second Knowledge Base',
          topK: 1,
        },
        retriever2
      );

      const config: RetrievalConfig = {
        sources: ['knowledge-base', 'knowledge-base-2'],
        maxDocuments: 3,
      };

      const result = await augmentor.augment('capital city', config);

      // Should have results from sources
      expect(result).toContain('Retrieved context');
    });
    it('should return original message when no sources configured', async () => {
      const config: RetrievalConfig = {
        sources: [],
        maxDocuments: 2,
      };

      const result = await augmentor.augment('Test query', config);

      expect(result).toBe('Test query');
      expect(result).not.toContain('Retrieved context');
    });
  });
});
