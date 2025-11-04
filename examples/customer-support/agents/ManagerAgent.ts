import { ManagerAgent as BaseManagerAgent } from '../../../src/agents/manager/ManagerAgent';
import { ProductSupportAgent } from './ProductSupportAgent';
import { BillingSupportAgent } from './BillingSupportAgent';
import { ReturnsAgent } from './ReturnsAgent';
import { ModelAdapter } from '../../../src/infrastructure/adapters/base/base';
import { MemoryManager } from '../../../src/core/memory/memory';

/**
 * Customer Support Manager Agent
 * Uses the base ManagerAgent with pre-registered specialist agents
 */
export function createCustomerSupportManager(
  adapter: ModelAdapter,
  memoryManager?: MemoryManager
): BaseManagerAgent {
  const productAgent = new ProductSupportAgent();
  const billingAgent = new BillingSupportAgent();
  const returnsAgent = new ReturnsAgent();

  return BaseManagerAgent.withAgents(
    adapter,
    [
      {
        name: 'ProductSupport',
        agent: productAgent,
        registration: ProductSupportAgent.getRegistration(),
      },
      {
        name: 'BillingSupport',
        agent: billingAgent,
        registration: BillingSupportAgent.getRegistration(),
      },
      {
        name: 'ReturnsSupport',
        agent: returnsAgent,
        registration: ReturnsAgent.getRegistration(),
      },
    ],
    memoryManager,
    {
      customPrompt: `You are a customer support manager for SmartHome Hub.

Your role is to understand the customer's question and route it to the most appropriate specialist agent using the available tools. You have access to three specialized agents:

1. **Product Support**: Technical issues, setup, troubleshooting, device pairing, features
2. **Billing Support**: Subscriptions, payments, invoices, charges, account issues  
3. **Returns Support**: Returns, refunds, exchanges, defective products, warranty

Analyze the customer's question carefully and delegate to the specialist best suited to help. Use the provided keywords and examples to guide your decision.

If the question involves multiple areas, choose the primary focus. For example:
- "I want a refund because the product doesn't work" → Returns (primary issue is refund)
- "How much does Premium cost?" → Billing (pricing question)
- "My device won't pair" → Product (technical issue)

Always be helpful and professional in your responses.`,
      includeDetailedCapabilities: true,
    }
  );
}
