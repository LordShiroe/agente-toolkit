/**
 * A document chunk with metadata
 */
export interface Document {
  /** Unique identifier for the document */
  id: string;

  /** The text content */
  content: string;

  /** Optional metadata for filtering and tracking */
  metadata?: Record<string, any>;

  /** Embedding vector (if already computed) */
  embedding?: number[];
}

/**
 * A retrieved document with similarity score
 */
export interface RetrievedDocument extends Document {
  /** Similarity score (0-1, higher is better) */
  score: number;
}
