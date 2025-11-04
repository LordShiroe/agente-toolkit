import { VectorStore, VectorQuery } from '../interfaces/VectorStore';
import { Document } from '../types/Document';
import { Embedder } from '../interfaces/Embedder';

/**
 * Simple in-memory vector store using cosine similarity
 * Useful for testing and small datasets
 */
export class InMemoryVectorStore implements VectorStore {
  name = 'in-memory-vector-store';
  private documents: Map<string, Document> = new Map();
  private embedder: Embedder;

  constructor(embedder: Embedder) {
    this.embedder = embedder;
  }

  async upsert(documents: Document[]): Promise<void> {
    for (const doc of documents) {
      // Embed if not already embedded
      if (!doc.embedding) {
        doc.embedding = await this.embedder.embed(doc.content);
      }
      this.documents.set(doc.id, doc);
    }
  }

  async query(query: VectorQuery): Promise<Array<Document & { score: number }>> {
    const queryVector = query.vector || (query.text ? await this.embedder.embed(query.text) : null);

    if (!queryVector) {
      throw new Error('Query must provide either vector or text');
    }

    const results: Array<Document & { score: number }> = [];

    this.documents.forEach((doc, id) => {
      // Apply metadata filters
      if (query.filters && !this._matchesFilters(doc.metadata || {}, query.filters)) {
        return;
      }

      if (!doc.embedding) {
        return;
      }

      const score = this._cosineSimilarity(queryVector, doc.embedding);

      // Apply minimum score threshold
      if (query.minScore !== undefined && score < query.minScore) {
        return;
      }

      results.push({ ...doc, score });
    });

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply topK limit
    const topK = query.topK || 10;
    return results.slice(0, topK);
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
  }

  async clear(): Promise<void> {
    this.documents.clear();
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private _matchesFilters(metadata: Record<string, any>, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }
}
