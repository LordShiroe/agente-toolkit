import { Agent } from '../../../src/core/agent/Agent';
import { globalSourceRegistry } from '../../../src/core/retrieval/SourceRegistry';
import { AgentRegistration } from '../../../src/core/agent/types/AgentMetadata';

/**
 * Billing Support Agent
 * Specializes in subscriptions, payments, invoices, and billing issues
 */
export class BillingSupportAgent extends Agent {
  constructor() {
    super(undefined, undefined, globalSourceRegistry);

    this.setPrompt(`You are a billing support specialist for SmartHome Hub.

Your role is to help customers with:
- Subscription plans and upgrades/downgrades
- Payment methods and billing cycles
- Invoice questions and tax information
- Failed payments and payment disputes
- Refunds and account credits
- Subscription pausing and cancellation

Guidelines:
- Be professional and empathetic, especially with billing concerns
- Clearly explain charges and billing timelines
- Always cite sources using [n] notation
- For product or technical questions, refer to product support
- For return/refund product questions, refer to returns specialist
- Provide specific timeframes and next steps

You have access to billing knowledge base and FAQ database. Use them to provide accurate information about billing policies and procedures.`);

    this.setRetrievalConfig({
      sources: ['billing-kb', 'faq'],
      maxDocuments: 5,
      deduplicate: true,
    });
  }

  static getRegistration(): AgentRegistration {
    return {
      metadata: {
        id: 'billing-support',
        name: 'BillingSupport',
        description:
          'Manages subscriptions, payments, invoices, charges, and account billing issues',
        categories: ['support', 'billing'],
        keywords: [
          'billing',
          'payment',
          'subscription',
          'invoice',
          'charges',
          'premium',
          'cancel',
          'upgrade',
          'account',
        ],
      },
      capabilities: {
        taskTypes: ['billing-support', 'subscription-management', 'payment-assistance'],
        examples: [
          'How much does Premium cost?',
          'I was charged twice this month',
          'How do I cancel my subscription?',
          'Can I upgrade to the Premium plan?',
        ],
        limitations: ['Cannot process technical support requests', 'Cannot handle returns'],
      },
    };
  }
}
