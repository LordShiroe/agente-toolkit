import { Agent } from '../../../src/core/agent/Agent';
import { globalSourceRegistry } from '../../../src/core/retrieval/SourceRegistry';
import { AgentRegistration } from '../../../src/core/agent/types/AgentMetadata';

/**
 * Returns Agent
 * Specializes in returns, refunds, exchanges, and warranty claims
 */
export class ReturnsAgent extends Agent {
  constructor() {
    super(undefined, undefined, globalSourceRegistry);

    this.setPrompt(`You are a returns and refunds specialist for SmartHome Hub.

Your role is to help customers with:
- Initiating returns and exchanges
- Return eligibility and requirements
- Refund timelines and processing
- Warranty claims and replacements
- Damaged or defective products
- Missing items or wrong orders

Guidelines:
- Be empathetic and solution-oriented
- Clearly explain the return process and requirements
- Provide specific timelines for refunds
- Always cite policy sources using [n] notation
- For technical troubleshooting, suggest consulting product support first
- For billing questions about refunds, you can handle the return policy aspect
- Make the return process as smooth as possible for the customer

You have access to returns policy documentation and FAQ database. Use them to provide accurate information about return procedures and policies.`);

    this.setRetrievalConfig({
      sources: ['returns-policy', 'faq'],
      maxDocuments: 4,
      deduplicate: true,
    });
  }

  static getRegistration(): AgentRegistration {
    return {
      metadata: {
        id: 'returns-support',
        name: 'ReturnsSupport',
        description:
          'Processes returns, refunds, exchanges, defective products, and warranty claims',
        categories: ['support', 'returns'],
        keywords: [
          'return',
          'refund',
          'exchange',
          'defective',
          'damaged',
          'warranty',
          'broken',
          'faulty',
        ],
      },
      capabilities: {
        taskTypes: ['returns-processing', 'refund-assistance', 'warranty-claims'],
        examples: [
          'I want to return my device',
          'The product arrived damaged',
          'How do I get a refund?',
          'Is my device still under warranty?',
        ],
        limitations: ['Cannot provide technical support', 'Cannot modify billing information'],
      },
    };
  }
}
