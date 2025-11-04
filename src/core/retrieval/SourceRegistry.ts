import { Retriever } from './interfaces/Retriever';
import { SourceConfig } from './types/RetrievalConfig';

/**
 * Registry for retrieval sources
 * Maps source IDs to configured retrievers
 */
export class SourceRegistry {
  private sources = new Map<string, { config: SourceConfig; retriever: Retriever }>();

  /**
   * Register a retrieval source
   */
  register(config: SourceConfig, retriever: Retriever): void {
    this.sources.set(config.id, { config, retriever });
  }

  /**
   * Get a retriever by source ID
   */
  getRetriever(sourceId: string): Retriever | undefined {
    return this.sources.get(sourceId)?.retriever;
  }

  /**
   * Get source configuration
   */
  getConfig(sourceId: string): SourceConfig | undefined {
    return this.sources.get(sourceId)?.config;
  }

  /**
   * Get all registered source IDs
   */
  getSourceIds(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Check if a source is registered
   */
  has(sourceId: string): boolean {
    return this.sources.has(sourceId);
  }

  /**
   * Unregister a source
   */
  unregister(sourceId: string): void {
    this.sources.delete(sourceId);
  }

  /**
   * Clear all sources
   */
  clear(): void {
    this.sources.clear();
  }
}

// Global singleton instance
const globalSourceRegistry = new SourceRegistry();

export { globalSourceRegistry };
