import { Document } from '../types/Document';

/**
 * Query for vector store retrieval
 */
export interface VectorQuery {
  /** The query vector */
  vector?: number[];

  /** Or the raw text query (store will embed it) */
  text?: string;

  /** Maximum number of results to return */
  topK?: number;

  /** Minimum similarity score (0-1) */
  minScore?: number;

  /** Metadata filters */
  filters?: Record<string, any>;
}

/**
 * Interface for vector storage and retrieval
 */
export interface VectorStore {
  /** The name of the vector store (for logging/debugging) */
  name: string;

  /**
   * Add documents to the store
   * @param documents Documents to add (will be embedded if no embedding present)
   */
  upsert(documents: Document[]): Promise<void>;

  /**
   * Query the store for similar documents
   * @param query Query parameters
   * @returns Array of documents with similarity scores
   */
  query(query: VectorQuery): Promise<Array<Document & { score: number }>>;

  /**
   * Delete documents by ID
   * @param ids Document IDs to delete
   */
  delete(ids: string[]): Promise<void>;

  /**
   * Clear all documents from the store
   */
  clear(): Promise<void>;
}
