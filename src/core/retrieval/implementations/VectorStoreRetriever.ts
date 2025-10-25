import { Retriever, RetrieveOptions } from '../interfaces/Retriever';
import { VectorStore } from '../interfaces/VectorStore';
import { RetrievedDocument } from '../types/Document';

/**
 * Simple retriever backed by a vector store
 */
export class VectorStoreRetriever implements Retriever {
  name: string;
  private vectorStore: VectorStore;

  constructor(vectorStore: VectorStore, name?: string) {
    this.vectorStore = vectorStore;
    this.name = name || `vector-retriever-${vectorStore.name}`;
  }

  async retrieve(query: string, options?: RetrieveOptions): Promise<RetrievedDocument[]> {
    const results = await this.vectorStore.query({
      text: query,
      topK: options?.topK,
      minScore: options?.minScore,
      filters: options?.filters,
    });

    return results;
  }
}
