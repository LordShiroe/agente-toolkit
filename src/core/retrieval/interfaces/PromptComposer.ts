import { RetrievedDocument } from '../types/Document';

/**
 * Message format for LLM prompts
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Interface for composing prompts with retrieved context
 */
export interface PromptComposer {
  /**
   * Compose a prompt by injecting retrieved documents
   * @param basePrompt The original prompt/message
   * @param documents Retrieved documents to inject
   * @param systemPrompt Optional system prompt
   * @returns Augmented prompt string or message array
   */
  compose(
    basePrompt: string,
    documents: RetrievedDocument[],
    systemPrompt?: string
  ): string | Message[];
}
