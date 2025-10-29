import { Agent } from '../../../src/core/agent/Agent';
import { Type } from '@sinclair/typebox';
import { ProductSupportAgent } from './ProductSupportAgent';
import { BillingSupportAgent } from './BillingSupportAgent';
import { ReturnsAgent } from './ReturnsAgent';
import { ModelAdapter } from '../../../src/infrastructure/adapters/base/base';

/**
 * Manager Agent
 * Routes customer questions to the appropriate specialist agent
 */
export class ManagerAgent extends Agent {
  private productAgent: ProductSupportAgent;
  private billingAgent: BillingSupportAgent;
  private returnsAgent: ReturnsAgent;

  constructor() {
    super(); // No registry needed for manager

    this.productAgent = new ProductSupportAgent();
    this.billingAgent = new BillingSupportAgent();
    this.returnsAgent = new ReturnsAgent();

    this.setPrompt(`You are a customer support manager for SmartHome Hub.

Your role is to understand the customer's question and route it to the appropriate specialist:
- Product Support: Technical issues, setup, troubleshooting, device pairing, features
- Billing Support: Subscriptions, payments, invoices, charges, account issues
- Returns Support: Returns, refunds, exchanges, defective products, warranty

Analyze the customer's question and determine which specialist is most appropriate.
Use the route_to_specialist tool to forward the question.

If the question involves multiple areas, choose the primary focus. For example:
- "I want a refund because the product doesn't work" → Returns (primary issue is refund)
- "How much does Premium cost?" → Billing (pricing question)
- "My device won't pair" → Product (technical issue)

Be helpful and let the customer know you're connecting them to the right specialist.`);

    // Add routing tool
    this.addTool({
      name: 'route_to_specialist',
      description:
        'Route the customer question to the appropriate specialist agent (product, billing, or returns)',
      paramsSchema: Type.Object({
        specialist: Type.Union(
          [Type.Literal('product'), Type.Literal('billing'), Type.Literal('returns')],
          {
            description:
              'Which specialist to route to: "product" for technical/setup issues, "billing" for payment/subscription questions, "returns" for refunds/exchanges',
          }
        ),
        question: Type.String({
          description: 'The customer question to forward to the specialist',
        }),
      }),
      action: async (params: { specialist: 'product' | 'billing' | 'returns'; question: string }) =>
        this.routeToSpecialist(params.specialist, params.question),
    });
  }

  private async routeToSpecialist(
    specialist: 'product' | 'billing' | 'returns',
    question: string
  ): Promise<string> {
    // This is called by the tool during agent execution
    // Return a placeholder since the actual routing happens in the overridden run method
    return `Routing to ${specialist} specialist...`;
  }

  /**
   * Override run to handle routing logic
   */
  async run(message: string, model: ModelAdapter): Promise<string> {
    // Simple keyword-based routing (in production, could use LLM classification)
    const lowerMessage = message.toLowerCase();

    // Determine which specialist to use based on keywords
    let specialist: ProductSupportAgent | BillingSupportAgent | ReturnsAgent;
    let specialistName: string;

    if (
      lowerMessage.includes('return') ||
      lowerMessage.includes('refund') ||
      lowerMessage.includes('exchange') ||
      lowerMessage.includes('defective') ||
      lowerMessage.includes('damaged') ||
      lowerMessage.includes('warranty')
    ) {
      specialist = this.returnsAgent;
      specialistName = 'Returns Specialist';
    } else if (
      lowerMessage.includes('bill') ||
      lowerMessage.includes('payment') ||
      lowerMessage.includes('subscription') ||
      lowerMessage.includes('charge') ||
      lowerMessage.includes('invoice') ||
      lowerMessage.includes('premium') ||
      lowerMessage.includes('cancel') ||
      lowerMessage.includes('upgrade')
    ) {
      specialist = this.billingAgent;
      specialistName = 'Billing Specialist';
    } else {
      // Default to product support
      specialist = this.productAgent;
      specialistName = 'Product Support Specialist';
    }

    console.log(`  → Routing to: ${specialistName}\n`);

    // Forward to the specialist
    return await specialist.run(message, model);
  }
}
