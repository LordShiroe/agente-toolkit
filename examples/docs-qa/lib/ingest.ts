import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { TransformersEmbedder } from '../../../src/core/retrieval/implementations/TransformersEmbedder';
import { InMemoryVectorStore } from '../../../src/core/retrieval/implementations/InMemoryVectorStore';
import type { Document } from '../../../src/core/retrieval/types/Document';

export interface IngestOptions {
  /** Root directory to scan for documentation files (defaults to repo root) */
  rootDir?: string;
  /** Maximum characters per chunk (after Markdown stripping) */
  chunkSize?: number;
  /** Overlap characters between adjacent chunks */
  chunkOverlap?: number;
  /** Restrict ingestion to specific relative file paths */
  includePaths?: string[];
}

export interface IngestResult {
  embedder: TransformersEmbedder;
  store: InMemoryVectorStore;
  documents: Document[];
}

interface SourceDefinition {
  source: string;
  relativePath: string;
}

const DEFAULT_SOURCES: SourceDefinition[] = [
  { source: 'readme', relativePath: 'README.md' },
  { source: 'guide', relativePath: 'docs/guides/building-agents.md' },
  { source: 'guide', relativePath: 'docs/guides/rag-integration.md' },
  { source: 'guide', relativePath: 'docs/guides/tool-development.md' },
  { source: 'api', relativePath: 'docs/api/overview.md' },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveRootDir(options?: IngestOptions): string {
  if (options?.rootDir) {
    return path.resolve(options.rootDir);
  }

  // examples/docs-qa/lib -> repo root
  return path.resolve(__dirname, '..', '..', '..');
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

async function collectDocuments(options?: IngestOptions): Promise<Document[]> {
  const rootDir = resolveRootDir(options);
  const documents: Document[] = [];
  const chunkSize = options?.chunkSize ?? 600;
  const chunkOverlap = options?.chunkOverlap ?? 80;

  const sources = options?.includePaths
    ? DEFAULT_SOURCES.filter(source => options.includePaths!.includes(source.relativePath))
    : DEFAULT_SOURCES;

  for (const sourceDef of sources) {
    const absolutePath = path.join(rootDir, sourceDef.relativePath);
    const markdown = await readFileIfExists(absolutePath);
    if (!markdown) {
      console.warn(`Skipping missing documentation file: ${sourceDef.relativePath}`);
      continue;
    }

    const chunks = chunkMarkdown(markdown, sourceDef.source, sourceDef.relativePath, {
      chunkSize,
      chunkOverlap,
    });
    documents.push(...chunks);
  }

  return documents;
}

export async function ingestDocumentation(options?: IngestOptions): Promise<IngestResult> {
  const embedder = new TransformersEmbedder();
  const store = new InMemoryVectorStore(embedder);

  const documents = await collectDocuments(options);
  if (documents.length === 0) {
    console.warn('No documentation chunks collected. Ensure files exist.');
  }

  await store.upsert(documents);

  return {
    embedder,
    store,
    documents,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    console.info('Ingesting documentation into in-memory vector store...');
    const result = await ingestDocumentation();
    console.info(`Ingestion complete. Loaded ${result.documents.length} chunks.`);
  })().catch(error => {
    console.error('Failed to ingest documentation:', error);
    process.exitCode = 1;
  });
}
