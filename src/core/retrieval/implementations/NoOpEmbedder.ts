import { Embedder } from '../interfaces/Embedder';

/**
 * Simple hash-based embedder for testing when Transformers.js is unavailable
 * Generates deterministic vectors from text content
 */
class SimpleHashEmbedder implements Embedder {
  name = 'simple-hash-embedder';
  dimension: number;

  constructor(dimension = 384) {
    this.dimension = dimension;
  }

  private hashText(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const normalized = text.toLowerCase().trim();

    // Simple hash: use char codes to generate deterministic but varied vectors
    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      const idx = (charCode * (i + 1)) % this.dimension;
      vector[idx] += charCode / 255;
    }

    // Normalize to unit length for cosine similarity
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      return vector.map(v => v / norm);
    }
    return vector;
  }

  async embed(text: string): Promise<number[]> {
    return this.hashText(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(t => this.hashText(t));
  }
}

/**
 * Transformers.js-based embedder for real semantic embeddings
 */
class TransformersEmbedder implements Embedder {
  name = 'transformersjs-embedder';
  dimension = 384;

  private ready: Promise<any>;
  private model: string;

  constructor(
    model = 'Xenova/all-MiniLM-L6-v2',
    options?: { cacheDir?: string; quantized?: boolean; forceWasm?: boolean }
  ) {
    this.model = model;

    this.ready = this.initPipeline(options);
  }

  private async initPipeline(options?: {
    cacheDir?: string;
    quantized?: boolean;
    forceWasm?: boolean;
  }) {
    try {
      const { pipeline, env } = await import('@xenova/transformers');

      // Force WASM backend if requested, or use it by default to avoid binding issues
      if (options?.forceWasm !== false) {
        env.backends.onnx.wasm.numThreads = 1;
      }

      if (options?.cacheDir) {
        env.localModelPath = options.cacheDir;
      }

      return await pipeline('feature-extraction', this.model, {
        quantized: options?.quantized ?? true,
      });
    } catch (error) {
      throw new Error(
        `Failed to load Transformers.js: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const extractor: any = await this.ready;
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const embedding: number[] = Array.from(output.data || output);

    if (this.dimension === 0 || this.dimension === 384) {
      this.dimension = embedding.length;
    }

    return embedding;
  }

  async embed(text: string): Promise<number[]> {
    return this.getEmbedding(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.getEmbedding(text));
    }
    return results;
  }
}

/**
 * Local embedder that uses Transformers.js when available,
 * falls back to simple hash-based embedder for testing
 * Perfect for testing, examples, and local development
 */
export class NoOpEmbedder implements Embedder {
  private delegate: Embedder;
  private initialized: Promise<void>;

  get name() {
    return this.delegate.name;
  }
  get dimension() {
    return this.delegate.dimension;
  }

  constructor(
    model = 'Xenova/all-MiniLM-L6-v2',
    options?: { cacheDir?: string; quantized?: boolean; useSimple?: boolean; forceWasm?: boolean }
  ) {
    // Start with simple embedder
    this.delegate = new SimpleHashEmbedder(384);

    // Try to upgrade to transformers if not explicitly using simple
    if (!options?.useSimple) {
      this.initialized = this.tryLoadTransformers(model, options);
    } else {
      this.initialized = Promise.resolve();
    }
  }

  private async tryLoadTransformers(
    model: string,
    options?: { cacheDir?: string; quantized?: boolean; forceWasm?: boolean }
  ) {
    try {
      this.delegate = new TransformersEmbedder(model, options);
    } catch (error) {
      // Silently fall back to simple embedder
      console.warn('Transformers.js unavailable, using simple hash-based embedder for testing');
    }
  }

  async embed(text: string): Promise<number[]> {
    await this.initialized;
    return this.delegate.embed(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    await this.initialized;
    return this.delegate.embedBatch(texts);
  }
}
