import { Agent } from '../../../src/core/agent/Agent';
import { globalSourceRegistry } from '../../../src/core/retrieval/SourceRegistry';
import { AgentRegistration } from '../../../src/core/agent/types/AgentMetadata';

/**
 * Product Support Agent
 * Specializes in product features, setup, troubleshooting, and technical issues
 */
export class ProductSupportAgent extends Agent {
  constructor() {
    // Pass global registry to Agent
    super(undefined, undefined, globalSourceRegistry);

    this.setPrompt(`You are a product support specialist for SmartHome Hub Pro.

Your role is to help customers with:
- Product features and capabilities
- Initial setup and configuration
- Device pairing and connectivity
- Troubleshooting technical issues
- Advanced features and automation

Guidelines:
- Be friendly, patient, and clear in your explanations
- Provide step-by-step instructions when appropriate
- Always cite documentation sources using [n] notation
- If the issue requires physical repair, direct customer to warranty service
- For billing or return questions, politely refer to the appropriate specialist

You have access to product documentation and FAQ database. Use them to provide accurate, helpful responses.`);

    // Configure retrieval sources for this agent
    this.setRetrievalConfig({
      sources: ['product-docs', 'faq'],
      maxDocuments: 6,
      deduplicate: true,
    });
  }

  static getRegistration(): AgentRegistration {
    return {
      metadata: {
        id: 'product-support',
        name: 'ProductSupport',
        description:
          'Handles technical issues, setup, troubleshooting, device pairing, and product features for SmartHome Hub devices',
        categories: ['support', 'technical'],
        keywords: [
          'technical',
          'setup',
          'troubleshooting',
          'pairing',
          'devices',
          'features',
          'wifi',
          'connection',
          'app',
        ],
      },
      capabilities: {
        taskTypes: ['technical-support', 'setup-assistance', 'troubleshooting'],
        examples: [
          "My device won't pair with the app",
          'How do I set up my SmartHome Hub?',
          'The device keeps disconnecting from WiFi',
          'What features does the Premium plan include?',
        ],
        limitations: ['Cannot process returns or refunds', 'Cannot modify billing information'],
      },
    };
  }
}
