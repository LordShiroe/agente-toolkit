import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { TransformersEmbedder } from '../../../src/core/retrieval/implementations/TransformersEmbedder';
import { InMemoryVectorStore } from '../../../src/core/retrieval/implementations/InMemoryVectorStore';
import type { Document } from '../../../src/core/retrieval/types/Document';

export interface IngestResult {
  embedder: TransformersEmbedder;
  store: InMemoryVectorStore;
  documents: Document[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 80;

function categorizeSource(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').toLowerCase();

  if (normalized === 'readme.md') {
    return 'readme';
  }
  if (normalized.includes('/guides/') || normalized.startsWith('docs/guides/')) {
    return 'guide';
  }
  if (normalized.includes('/api/') || normalized.startsWith('docs/api/')) {
    return 'api';
  }
  if (normalized.includes('/adapters/') || normalized.startsWith('docs/adapters/')) {
    return 'adapter';
  }
  if (normalized.includes('/getting-started/') || normalized.startsWith('docs/getting-started/')) {
    return 'getting-started';
  }
  if (normalized.startsWith('examples/')) {
    return 'example';
  }
  if (normalized.startsWith('docs/')) {
    return 'documentation';
  }

  return 'other';
}

function isExcluded(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');

  if (normalized.startsWith('node_modules/') || normalized.includes('/node_modules/')) {
    return true;
  }
  if (normalized.startsWith('.git/') || normalized.includes('/.git/')) {
    return true;
  }
  if (normalized.startsWith('coverage/') || normalized.includes('/coverage/')) {
    return true;
  }
  if (normalized.startsWith('dist/') || normalized.includes('/dist/')) {
    return true;
  }
  if (normalized.startsWith('build/') || normalized.includes('/build/')) {
    return true;
  }
  if (normalized.startsWith('adr/') || normalized.includes('/adr/')) {
    return true;
  }
  if (
    normalized.endsWith('CHANGELOG.md') ||
    normalized.endsWith('CONTRIBUTING.md') ||
    normalized.endsWith('SECURITY.md') ||
    normalized.endsWith('LICENSE.md') ||
    normalized.endsWith('CODE_OF_CONDUCT.md')
  ) {
    return true;
  }

  return false;
}

async function scanMarkdownFiles(): Promise<string[]> {
  const markdownFiles: string[] = [];

  async function scan(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(REPO_ROOT, fullPath);

      if (isExcluded(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        markdownFiles.push(relativePath);
      }
    }
  }

  await scan(REPO_ROOT);
  return markdownFiles.sort();
}

async function readFileIfExists(fullPath: string): Promise<string | null> {
  try {
    return await fs.readFile(fullPath, 'utf-8');
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    .replace(/>\s?/g, '')
    .replace(/-{3,}/g, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeWhitespace(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function chunkMarkdown(
  markdown: string,
  source: string,
  filePath: string,
  options: { chunkSize: number; chunkOverlap: number }
): Document[] {
  const { chunkSize, chunkOverlap } = options;
  const lines = markdown.split('\n');
  const chunks: Document[] = [];
  let buffer: string[] = [];
  let currentHeading = 'Introduction';
  let chunkIndex = 0;

  const pushBuffer = () => {
    if (buffer.length === 0) {
      return;
    }
    const rawText = buffer.join('\n');
    const stripped = stripMarkdown(rawText);
    const normalized = normalizeWhitespace(stripped);
    if (!normalized) {
      buffer = [];
      return;
    }

    chunks.push({
      id: `${filePath}::${chunkIndex}`,
      content: normalized,
      metadata: {
        source,
        path: filePath,
        heading: currentHeading,
        chunkIndex,
      },
    });

    chunkIndex += 1;
    const overlapText = normalized.slice(Math.max(0, normalized.length - chunkOverlap));
    buffer = overlapText ? [overlapText] : [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      pushBuffer();
      currentHeading = headingMatch[2].trim();
      continue;
    }

    buffer.push(line);

    const strippedBuffer = stripMarkdown(buffer.join('\n'));
    if (strippedBuffer.length >= chunkSize) {
      pushBuffer();
    }
  }

  pushBuffer();

  return chunks;
}

async function collectDocuments(): Promise<Document[]> {
  const documents: Document[] = [];
  const stats = new Map<string, number>();

  console.log('🔍 Auto-discovering markdown files...');

  const discoveredFiles = await scanMarkdownFiles();
  console.log(`   Found ${discoveredFiles.length} markdown files`);

  const filesToProcess = discoveredFiles.map(relativePath => ({
    source: categorizeSource(relativePath),
    relativePath,
  }));

  for (const sourceDef of filesToProcess) {
    const absolutePath = path.join(REPO_ROOT, sourceDef.relativePath);
    const markdown = await readFileIfExists(absolutePath);
    if (!markdown) {
      console.warn(`⚠️  Skipping missing file: ${sourceDef.relativePath}`);
      continue;
    }

    const chunks = chunkMarkdown(markdown, sourceDef.source, sourceDef.relativePath, {
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });
    documents.push(...chunks);

    const count = stats.get(sourceDef.source) ?? 0;
    stats.set(sourceDef.source, count + chunks.length);
  }

  if (stats.size > 0) {
    console.log('📊 Ingestion statistics:');
    for (const [source, count] of Array.from(stats.entries()).sort()) {
      console.log(`   ${source}: ${count} chunks`);
    }
  }

  return documents;
}

export async function ingestDocumentation(): Promise<IngestResult> {
  console.log('📚 Ingesting documentation into vector store...\n');

  const embedder = new TransformersEmbedder();
  const store = new InMemoryVectorStore(embedder);

  const documents = await collectDocuments();
  if (documents.length === 0) {
    console.warn('⚠️  No documentation chunks collected. Ensure files exist.');
  }

  await store.upsert(documents);

  console.log(`\n✅ Ingestion complete: ${documents.length} total chunks loaded\n`);

  return {
    embedder,
    store,
    documents,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    const result = await ingestDocumentation();
    console.info(`🎉 Success! Processed ${result.documents.length} document chunks.`);
  })().catch(error => {
    console.error('❌ Failed to ingest documentation:', error);
    process.exitCode = 1;
  });
}
