import { ModelAdapter } from '../../infrastructure/adapters/base/base';
import { getLogger } from '../../infrastructure/logging/implementations/logger';

/**
 * Handles post-processing of raw execution results into conversational responses
 */
export class ResponseProcessor {
  private logger = getLogger();

  /**
   * Convert raw planner output to a conversational response
   */
  async generateConversationalResponse(
    originalMessage: string,
    rawResult: string,
    model: ModelAdapter,
    systemPrompt?: string
  ): Promise<string> {
    const conversationalPrompt = `${
      systemPrompt ? systemPrompt + '\n\n' : ''
    }The user asked: "${originalMessage}"

I executed the following tools to fulfill their request:

${rawResult}

Please provide a natural, helpful, conversational response to the user based on these tool execution results. Format the information in a user-friendly way.`;

    this.logger.debug('Generating conversational response from planner output');

    try {
      const conversationalResponse = await model.complete(conversationalPrompt);
      this.logger.debug('Conversational response generated successfully');
      return conversationalResponse;
    } catch (error) {
      this.logger.warn('Failed to generate conversational response, returning raw result', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback to raw result if conversation generation fails
      return rawResult;
    }
  }
}
