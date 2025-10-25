import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryVectorStore } from '../../../src/core/retrieval/implementations/InMemoryVectorStore';
import { NoOpEmbedder } from '../../../src/core/retrieval/implementations/NoOpEmbedder';
import { Document } from '../../../src/core/retrieval/types/Document';

describe('InMemoryVectorStore', () => {
  let vectorStore: InMemoryVectorStore;
  let embedder: NoOpEmbedder;

  beforeEach(() => {
    embedder = new NoOpEmbedder();
    vectorStore = new InMemoryVectorStore(embedder);
  });

  describe('upsert', () => {
    it('should add documents to the store', async () => {
      const docs: Document[] = [
        { id: '1', content: 'Document 1' },
        { id: '2', content: 'Document 2' },
      ];

      await vectorStore.upsert(docs);

      const results = await vectorStore.query({ text: 'test', topK: 10 });
      expect(results).toHaveLength(2);
    });

    it('should embed documents without embeddings', async () => {
      const docs: Document[] = [{ id: '1', content: 'Document 1' }];

      await vectorStore.upsert(docs);

      const results = await vectorStore.query({ text: 'test', topK: 10 });
      expect(results[0].embedding).toBeDefined();
      expect(results[0].embedding!.length).toBeGreaterThan(0);
    });

    it('should preserve existing embeddings', async () => {
      // Use the embedder's dimension for the custom embedding
      const sampleEmbedding = await embedder.embed('sample');
      const customEmbedding = new Array(sampleEmbedding.length).fill(0.5);
      const docs: Document[] = [{ id: '1', content: 'Document 1', embedding: customEmbedding }];

      await vectorStore.upsert(docs);

      const results = await vectorStore.query({ text: 'test', topK: 10 });
      expect(results[0].embedding).toEqual(customEmbedding);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      const docs: Document[] = [
        { id: '1', content: 'Paris is the capital of France' },
        { id: '2', content: 'London is the capital of England' },
        { id: '3', content: 'Berlin is the capital of Germany' },
      ];
      await vectorStore.upsert(docs);
    });

    it('should query by text', async () => {
      const results = await vectorStore.query({ text: 'capital of France', topK: 3 });
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('score');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should query by vector', async () => {
      // Get embedding for a query to use as vector
      const queryEmbedding = await embedder.embed('France capital city');
      const results = await vectorStore.query({ vector: queryEmbedding, topK: 3 });
      expect(results).toHaveLength(3);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should respect topK limit', async () => {
      const results = await vectorStore.query({ text: 'capital', topK: 2 });
      expect(results).toHaveLength(2);
    });

    it('should filter by minimum score', async () => {
      const results = await vectorStore.query({ text: 'Paris France', topK: 10, minScore: 0.5 });
      // With real embeddings, similar docs should score higher
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => expect(r.score).toBeGreaterThanOrEqual(0.5));
    });

    it('should apply metadata filters', async () => {
      await vectorStore.clear();
      const docs: Document[] = [
        { id: '1', content: 'Doc 1', metadata: { category: 'A' } },
        { id: '2', content: 'Doc 2', metadata: { category: 'B' } },
      ];
      await vectorStore.upsert(docs);

      const results = await vectorStore.query({
        text: 'document',
        topK: 10,
        filters: { category: 'A' },
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('should throw error if no vector or text provided', async () => {
      await expect(vectorStore.query({ topK: 10 })).rejects.toThrow(
        'Query must provide either vector or text'
      );
    });
  });

  describe('delete', () => {
    it('should delete documents by ID', async () => {
      const docs: Document[] = [
        { id: '1', content: 'Document 1' },
        { id: '2', content: 'Document 2' },
      ];
      await vectorStore.upsert(docs);

      await vectorStore.delete(['1']);

      const results = await vectorStore.query({ text: 'test', topK: 10 });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });
  });

  describe('clear', () => {
    it('should clear all documents', async () => {
      const docs: Document[] = [
        { id: '1', content: 'Document 1' },
        { id: '2', content: 'Document 2' },
      ];
      await vectorStore.upsert(docs);

      await vectorStore.clear();

      const results = await vectorStore.query({ text: 'test', topK: 10 });
      expect(results).toHaveLength(0);
    });
  });
});
