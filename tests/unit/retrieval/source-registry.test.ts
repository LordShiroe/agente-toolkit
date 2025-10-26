import { describe, it, expect, beforeEach } from 'vitest';
import { SourceRegistry } from '../../../src/core/retrieval/SourceRegistry';
import { VectorStoreRetriever } from '../../../src/core/retrieval/implementations/VectorStoreRetriever';
import { InMemoryVectorStore } from '../../../src/core/retrieval/implementations/InMemoryVectorStore';
import { LocalEmbedder } from '../../../src/core/retrieval/implementations/LocalEmbedder';
import { SourceConfig } from '../../../src/core/retrieval/types/RetrievalConfig';

describe('SourceRegistry', () => {
  let registry: SourceRegistry;
  let retriever: VectorStoreRetriever;
  let sourceConfig: SourceConfig;

  beforeEach(() => {
    registry = new SourceRegistry();
    const embedder = new LocalEmbedder();
    const vectorStore = new InMemoryVectorStore(embedder);
    retriever = new VectorStoreRetriever(vectorStore);

    sourceConfig = {
      id: 'test-source',
      name: 'Test Source',
      description: 'A test retrieval source',
      topK: 5,
      minScore: 0.7,
    };
  });

  describe('register', () => {
    it('should register a source', () => {
      registry.register(sourceConfig, retriever);

      expect(registry.has('test-source')).toBe(true);
      expect(registry.getRetriever('test-source')).toBe(retriever);
      expect(registry.getConfig('test-source')).toEqual(sourceConfig);
    });

    it('should overwrite existing source with same ID', () => {
      const embedder2 = new LocalEmbedder();
      const vectorStore2 = new InMemoryVectorStore(embedder2);
      const retriever2 = new VectorStoreRetriever(vectorStore2);

      registry.register(sourceConfig, retriever);
      registry.register(sourceConfig, retriever2);

      expect(registry.getRetriever('test-source')).toBe(retriever2);
    });
  });

  describe('getRetriever', () => {
    it('should return undefined for non-existent source', () => {
      expect(registry.getRetriever('non-existent')).toBeUndefined();
    });

    it('should return registered retriever', () => {
      registry.register(sourceConfig, retriever);
      expect(registry.getRetriever('test-source')).toBe(retriever);
    });
  });

  describe('getConfig', () => {
    it('should return undefined for non-existent source', () => {
      expect(registry.getConfig('non-existent')).toBeUndefined();
    });

    it('should return registered config', () => {
      registry.register(sourceConfig, retriever);
      expect(registry.getConfig('test-source')).toEqual(sourceConfig);
    });
  });

  describe('getSourceIds', () => {
    it('should return empty array when no sources registered', () => {
      expect(registry.getSourceIds()).toEqual([]);
    });

    it('should return all registered source IDs', () => {
      const config2: SourceConfig = {
        id: 'source-2',
        name: 'Source 2',
      };

      registry.register(sourceConfig, retriever);
      registry.register(config2, retriever);

      const ids = registry.getSourceIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('test-source');
      expect(ids).toContain('source-2');
    });
  });

  describe('has', () => {
    it('should return false for non-existent source', () => {
      expect(registry.has('non-existent')).toBe(false);
    });

    it('should return true for registered source', () => {
      registry.register(sourceConfig, retriever);
      expect(registry.has('test-source')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should remove a registered source', () => {
      registry.register(sourceConfig, retriever);
      expect(registry.has('test-source')).toBe(true);

      registry.unregister('test-source');
      expect(registry.has('test-source')).toBe(false);
    });

    it('should not throw when unregistering non-existent source', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all registered sources', () => {
      const config2: SourceConfig = {
        id: 'source-2',
        name: 'Source 2',
      };

      registry.register(sourceConfig, retriever);
      registry.register(config2, retriever);

      expect(registry.getSourceIds()).toHaveLength(2);

      registry.clear();

      expect(registry.getSourceIds()).toHaveLength(0);
    });
  });
});
