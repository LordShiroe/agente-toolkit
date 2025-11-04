import { PromptComposer } from '../interfaces/PromptComposer';
import { RetrievedDocument } from '../types/Document';

/**
 * Default prompt composer that injects retrieved context into the prompt
 */
export class DefaultPromptComposer implements PromptComposer {
  private contextTemplate: string;

  constructor(contextTemplate?: string) {
    this.contextTemplate =
      contextTemplate ||
      `Retrieved context (top relevant documents):
{{context}}

---`;
  }

  compose(basePrompt: string, documents: RetrievedDocument[], systemPrompt?: string): string {
    if (documents.length === 0) {
      // No documents to inject, return just the base prompt
      return basePrompt;
    }

    // Format retrieved documents
    const contextText = documents
      .map(
        (doc, idx) =>
          `[${idx + 1}] (score: ${doc.score.toFixed(3)})\n${doc.content}\n${
            doc.metadata ? `Metadata: ${JSON.stringify(doc.metadata)}` : ''
          }`
      )
      .join('\n\n');

    const contextSection = this.contextTemplate.replace('{{context}}', contextText);

    // Build final prompt
    let fullPrompt = '';

    if (systemPrompt) {
      fullPrompt += `${systemPrompt}\n\n`;
    }

    fullPrompt += `${contextSection}\n\n`;
    fullPrompt += `User request: ${basePrompt}`;

    return fullPrompt;
  }
}
