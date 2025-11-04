import { RetrievedDocument } from '../types/Document';

/**
 * Options for retrieval
 */
export interface RetrieveOptions {
  /** Maximum number of documents to return */
  topK?: number;

  /** Minimum similarity score threshold */
  minScore?: number;

  /** Metadata filters */
  filters?: Record<string, any>;
}

/**
 * Interface for document retrieval
 * Abstracts over vector stores and provides high-level retrieval
 */
export interface Retriever {
  /** The name of the retriever (for logging/debugging) */
  name: string;

  /**
   * Retrieve relevant documents for a query
   * @param query The search query
   * @param options Retrieval options
   * @returns Array of retrieved documents with scores
   */
  retrieve(query: string, options?: RetrieveOptions): Promise<RetrievedDocument[]>;
}
