/**
 * Interface for text embedding services
 */
export interface Embedder {
  /** The name of the embedder (for logging/debugging) */
  name: string;

  /**
   * Embed a single text string
   * @param text The text to embed
   * @returns A vector representation
   */
  embed(text: string): Promise<number[]>;

  /**
   * Embed multiple texts in a batch
   * @param texts Array of texts to embed
   * @returns Array of vectors in the same order
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * The dimension of the embedding vectors produced
   */
  dimension: number;
}
