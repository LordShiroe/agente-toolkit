/**
 * Configuration for a retrieval source
 */
export interface SourceConfig {
  /** Unique identifier for this source */
  id: string;

  /** Human-readable name */
  name: string;

  /** Optional description */
  description?: string;

  /** Maximum number of documents to retrieve */
  topK?: number;

  /** Minimum similarity score threshold (0-1) */
  minScore?: number;

  /** Metadata filters to apply */
  filters?: Record<string, any>;
}

/**
 * Configuration for retrieval augmentation
 */
export interface RetrievalConfig {
  /** Sources to query */
  sources: string[];

  /** Maximum total documents across all sources */
  maxDocuments?: number;

  /** Whether to deduplicate results */
  deduplicate?: boolean;

  /** Custom prompt template for injecting context */
  contextTemplate?: string;
}
