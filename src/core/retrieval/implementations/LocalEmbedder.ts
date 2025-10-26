import { TransformersEmbedder, TransformersEmbedderOptions } from './TransformersEmbedder';
import { Embedder } from '../interfaces/Embedder';

/**
 * Convenient local embedder using Transformers.js with sensible defaults.
 *
 * This is a simple wrapper around TransformersEmbedder that provides:
 * - WASM backend by default (no native bindings needed)
 * - Popular model pre-configured (all-MiniLM-L6-v2)
 * - Quantized models for faster performance
 * - Works on all platforms without additional setup
 *
 * Perfect for:
 * - Local development and testing
 * - Prototyping RAG systems
 * - Small-scale production use
 * - Running without API keys
 *
 * For production at scale, consider API-based embedders like:
 * - OpenAIEmbedder (text-embedding-3-small)
 * - CohereEmbedder (embed-english-v3.0)
 * - VoyageEmbedder (voyage-2)
 *
 * @example Basic usage
 * ```typescript
 * const embedder = new LocalEmbedder();
 * const vector = await embedder.embed('Hello world');
 * ```
 *
 * @example Custom model
 * ```typescript
 * const embedder = new LocalEmbedder('Xenova/bge-small-en-v1.5');
 * ```
 *
 * @example With options
 * ```typescript
 * const embedder = new LocalEmbedder('Xenova/all-MiniLM-L6-v2', {
 *   cacheDir: '/var/cache/models',
 *   quantized: true,
 * });
 * ```
 */
export class LocalEmbedder implements Embedder {
  private readonly embedder: TransformersEmbedder;
  readonly name: string;
  readonly dimension: number;

  constructor(model = 'Xenova/all-MiniLM-L6-v2', options: TransformersEmbedderOptions = {}) {
    // Always use WASM by default for maximum compatibility
    this.embedder = new TransformersEmbedder(model, {
      forceWasm: true,
      quantized: true,
      ...options,
    });
    this.name = this.embedder.name;
    this.dimension = this.embedder.dimension;
  }

  async embed(text: string): Promise<number[]> {
    return this.embedder.embed(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.embedder.embedBatch(texts);
  }
}
