import { TransformersEmbedder } from '../../../src/core/retrieval/implementations/TransformersEmbedder';
import { InMemoryVectorStore } from '../../../src/core/retrieval/implementations/InMemoryVectorStore';
import type { Document } from '../../../src/core/retrieval/types/Document';
import { PRODUCT_DOCS, FAQ_DATA, BILLING_KB, RETURNS_POLICY } from './data';

export interface IngestResult {
  store: InMemoryVectorStore;
  documents: Document[];
}

/**
 * Split text into chunks by paragraphs/sections
 */
function chunkText(text: string, sourceType: string, chunkSize = 500): Document[] {
  const chunks: Document[] = [];

  // Split by double newlines (paragraphs) or headers
  const sections = text
    .split(/\n\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const section of sections) {
    // If adding this section exceeds chunk size, save current chunk
    if (currentChunk.length + section.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        id: `${sourceType}::${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          source: sourceType,
          chunkIndex,
        },
      });
      chunkIndex++;
      currentChunk = '';
    }

    currentChunk += section + '\n\n';
  }

  // Push final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `${sourceType}::${chunkIndex}`,
      content: currentChunk.trim(),
      metadata: {
        source: sourceType,
        chunkIndex,
      },
    });
  }

  return chunks;
}

/**
 * Ingest product documentation
 */
export async function ingestProductDocs(): Promise<IngestResult> {
  console.log('  📦 Ingesting product documentation...');
  const embedder = new TransformersEmbedder();
  const store = new InMemoryVectorStore(embedder);

  const documents = chunkText(PRODUCT_DOCS, 'product-docs', 600);
  await store.upsert(documents);

  console.log(`     ✓ Loaded ${documents.length} product doc chunks`);
  return { store, documents };
}

/**
 * Ingest FAQ data
 */
export async function ingestFAQ(): Promise<IngestResult> {
  console.log('  ❓ Ingesting FAQ database...');
  const embedder = new TransformersEmbedder();
  const store = new InMemoryVectorStore(embedder);

  const documents = chunkText(FAQ_DATA, 'faq', 400);
  await store.upsert(documents);

  console.log(`     ✓ Loaded ${documents.length} FAQ chunks`);
  return { store, documents };
}

/**
 * Ingest billing knowledge base
 */
export async function ingestBillingKB(): Promise<IngestResult> {
  console.log('  💳 Ingesting billing knowledge base...');
  const embedder = new TransformersEmbedder();
  const store = new InMemoryVectorStore(embedder);

  const documents = chunkText(BILLING_KB, 'billing-kb', 500);
  await store.upsert(documents);

  console.log(`     ✓ Loaded ${documents.length} billing KB chunks`);
  return { store, documents };
}

/**
 * Ingest returns policy
 */
export async function ingestReturnsPolicy(): Promise<IngestResult> {
  console.log('  ↩️  Ingesting returns policy...');
  const embedder = new TransformersEmbedder();
  const store = new InMemoryVectorStore(embedder);

  const documents = chunkText(RETURNS_POLICY, 'returns-policy', 500);
  await store.upsert(documents);

  console.log(`     ✓ Loaded ${documents.length} returns policy chunks`);
  return { store, documents };
}
