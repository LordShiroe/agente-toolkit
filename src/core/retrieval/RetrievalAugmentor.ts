import { RetrievedDocument } from './types/Document';
import { RetrievalConfig } from './types/RetrievalConfig';
import { PromptComposer } from './interfaces/PromptComposer';
import { SourceRegistry } from './SourceRegistry';
import { DefaultPromptComposer } from './implementations/DefaultPromptComposer';

/**
 * Augments prompts with retrieved context from configured sources
 */
export class RetrievalAugmentor {
  private sourceRegistry: SourceRegistry;
  private promptComposer: PromptComposer;

  constructor(sourceRegistry: SourceRegistry, promptComposer?: PromptComposer) {
    this.sourceRegistry = sourceRegistry;
    this.promptComposer = promptComposer || new DefaultPromptComposer();
  }

  /**
   * Augment a prompt with retrieved context
   * @param message The user message/query
   * @param config Retrieval configuration
   * @param systemPrompt Optional system prompt
   * @returns Augmented prompt string
   */
  async augment(message: string, config: RetrievalConfig, systemPrompt?: string): Promise<string> {
    // Retrieve from all configured sources
    const allDocuments: RetrievedDocument[] = [];

    for (const sourceId of config.sources) {
      const retriever = this.sourceRegistry.getRetriever(sourceId);
      const sourceConfig = this.sourceRegistry.getConfig(sourceId);

      if (!retriever) {
        console.warn(`Retrieval source '${sourceId}' not found in registry, skipping`);
        continue;
      }

      try {
        const docs = await retriever.retrieve(message, {
          topK: sourceConfig?.topK,
          minScore: sourceConfig?.minScore,
          filters: sourceConfig?.filters,
        });
        allDocuments.push(...docs);
      } catch (error) {
        console.error(`Error retrieving from source '${sourceId}':`, error);
      }
    }

    // Sort by score and deduplicate if needed
    allDocuments.sort((a, b) => b.score - a.score);

    if (config.deduplicate) {
      const seen = new Set<string>();
      const deduplicated: RetrievedDocument[] = [];

      for (const doc of allDocuments) {
        const key = doc.content.trim();
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(doc);
        }
      }

      allDocuments.length = 0;
      allDocuments.push(...deduplicated);
    }

    // Apply max documents limit
    const maxDocs = config.maxDocuments || 10;
    const finalDocuments = allDocuments.slice(0, maxDocs);

    // Compose augmented prompt
    const result = this.promptComposer.compose(message, finalDocuments, systemPrompt);

    // For now, we only support string output (can be extended for Message[] later)
    if (typeof result === 'string') {
      return result;
    }

    // If composer returns messages, flatten to string
    return result.map(m => `${m.role}: ${m.content}`).join('\n');
  }
}
