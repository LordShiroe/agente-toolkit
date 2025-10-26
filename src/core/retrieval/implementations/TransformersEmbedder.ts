import { Embedder } from '../interfaces/Embedder';

export interface TransformersEmbedderOptions {
  /** Custom cache directory for downloaded models. Defaults to ~/.cache/huggingface */
  cacheDir?: string;
  /** Use quantized (8-bit) models for smaller size and faster inference. Defaults to true */
  quantized?: boolean;
  /** Force WASM backend instead of native ONNX Runtime bindings. Defaults to true for compatibility */
  forceWasm?: boolean;
}

/**
 * Embedder implementation using Transformers.js for local semantic embeddings.
 *
 * Features:
 * - Fully local execution (no API calls)
 * - Uses WASM backend by default (works everywhere, no native bindings)
 * - Downloads models on first use (~20MB, then cached)
 * - Supports any Hugging Face sentence-transformer model
 *
 * @example
 * ```typescript
 * const embedder = new TransformersEmbedder('Xenova/all-MiniLM-L6-v2');
 * const vector = await embedder.embed('Hello world');
 * console.log(vector.length); // 384
 * ```
 */
export class TransformersEmbedder implements Embedder {
  readonly name = 'transformers-embedder';
  readonly dimension: number;

  private readonly model: string;
  private readonly pipeline: Promise<any>;

  constructor(model = 'Xenova/all-MiniLM-L6-v2', options: TransformersEmbedderOptions = {}) {
    this.model = model;
    // Set dimension based on known models, will be validated on first embed
    this.dimension = this.getModelDimension(model);
    this.pipeline = this.initializePipeline(options);
  }

  private getModelDimension(model: string): number {
    // Common model dimensions
    const knownModels: Record<string, number> = {
      'Xenova/all-MiniLM-L6-v2': 384,
      'Xenova/all-mpnet-base-v2': 768,
      'Xenova/bge-small-en-v1.5': 384,
      'Xenova/bge-base-en-v1.5': 768,
      'Xenova/bge-large-en-v1.5': 1024,
      'Xenova/jina-embeddings-v2-small-en': 512,
    };

    return knownModels[model] ?? 384; // Default to 384
  }

  private async initializePipeline(options: TransformersEmbedderOptions): Promise<any> {
    try {
      const { pipeline, env } = await import('@xenova/transformers');

      // Use WASM backend by default to avoid native binding issues
      // This works across all platforms (Linux, macOS, Windows, Alpine, ARM)
      if (options.forceWasm !== false) {
        env.backends.onnx.wasm.numThreads = 1;
      }

      if (options.cacheDir) {
        env.localModelPath = options.cacheDir;
      }

      return await pipeline('feature-extraction', this.model, {
        quantized: options.quantized ?? true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to initialize Transformers.js embedder with model "${this.model}": ${message}\n` +
          `Make sure @xenova/transformers is installed: npm install @xenova/transformers`
      );
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const extractor = await this.pipeline;
      const output = await extractor(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Handle different output formats from transformers.js
      const embedding: number[] = Array.from(output.data || output);

      // Validate dimension matches expected
      if (embedding.length !== this.dimension) {
        console.warn(
          `Model returned ${embedding.length} dimensions, expected ${this.dimension}. ` +
            `This might indicate a model mismatch.`
        );
      }

      return embedding;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate embedding for text: ${message}`);
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Process sequentially for now
    // Future optimization: use true batching from transformers.js
    const embeddings: number[][] = [];
    for (const text of texts) {
      embeddings.push(await this.embed(text));
    }
    return embeddings;
  }
}
