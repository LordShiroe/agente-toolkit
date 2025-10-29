import { globalSourceRegistry } from '../../../src/core/retrieval/SourceRegistry';
import { VectorStoreRetriever } from '../../../src/core/retrieval/implementations/VectorStoreRetriever';
import { ingestProductDocs, ingestFAQ, ingestBillingKB, ingestReturnsPolicy } from './ingest';

/**
 * Setup all global retrieval sources and register them
 */
export async function setupGlobalSources(): Promise<void> {
  console.log('🔧 Setting up global retrieval sources...\n');

  // 1. Product Documentation
  const { store: productStore } = await ingestProductDocs();
  const productRetriever = new VectorStoreRetriever(productStore, 'product-docs-retriever');
  globalSourceRegistry.register(
    {
      id: 'product-docs',
      name: 'Product Documentation',
      description: 'SmartHome Hub Pro product manuals and guides',
      topK: 5,
      minScore: 0.3,
    },
    productRetriever
  );

  // 2. FAQ Database
  const { store: faqStore } = await ingestFAQ();
  const faqRetriever = new VectorStoreRetriever(faqStore, 'faq-retriever');
  globalSourceRegistry.register(
    {
      id: 'faq',
      name: 'Frequently Asked Questions',
      description: 'Common customer questions and answers',
      topK: 3,
      minScore: 0.4,
    },
    faqRetriever
  );

  // 3. Billing Knowledge Base
  const { store: billingStore } = await ingestBillingKB();
  const billingRetriever = new VectorStoreRetriever(billingStore, 'billing-retriever');
  globalSourceRegistry.register(
    {
      id: 'billing-kb',
      name: 'Billing Knowledge Base',
      description: 'Subscription, payment, and billing information',
      topK: 4,
      minScore: 0.4,
    },
    billingRetriever
  );

  // 4. Returns Policy
  const { store: returnsStore } = await ingestReturnsPolicy();
  const returnsRetriever = new VectorStoreRetriever(returnsStore, 'returns-retriever');
  globalSourceRegistry.register(
    {
      id: 'returns-policy',
      name: 'Returns & Refunds Policy',
      description: 'Return, refund, and exchange procedures',
      topK: 4,
      minScore: 0.5,
    },
    returnsRetriever
  );

  const sourceIds = globalSourceRegistry.getSourceIds();
  console.log(`\n✅ Registered ${sourceIds.length} sources: ${sourceIds.join(', ')}\n`);
}
