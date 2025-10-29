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
  /** Restrict ingestion to specific relative file paths (disables auto-discovery) */
  includePaths?: string[];
  /** Enable automatic discovery of all .md files (default: true) */
  autoDiscover?: boolean;
  /** Patterns to exclude from auto-discovery */
  excludePatterns?: string[];
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

const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules/**',
  '**/node_modules/**',
  'coverage/**',
  '**/coverage/**',
  'dist/**',
  '**/dist/**',
  'build/**',
  '**/build/**',
  '.git/**',
  '**/.git/**',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'LICENSE.md',
  'CODE_OF_CONDUCT.md',
  'adr/**',
  '**/adr/**',
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveRootDir(options?: IngestOptions): string {
  if (options?.rootDir) {
    return path.resolve(options.rootDir);
  }

  // examples/docs-qa/lib -> repo root
  return path.resolve(__dirname, '..', '..', '..');
}

/**
 * Categorize a file based on its path to determine the source type
 */
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

/**
 * Check if a file path matches any of the exclude patterns
 */
function isExcluded(relativePath: string, excludePatterns: string[]): boolean {
  const normalized = relativePath.replace(/\\/g, '/');

  // Quick check for common exclusions
  if (normalized.startsWith('node_modules/') || normalized.includes('/node_modules/')) {
    return true;
  }
  if (normalized.startsWith('.git/') || normalized.includes('/.git/')) {
    return true;
  }

  for (const pattern of excludePatterns) {
    const regexPattern = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    if (regex.test(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively scan directory for markdown files
 */
async function scanMarkdownFiles(rootDir: string, excludePatterns: string[]): Promise<string[]> {
  const markdownFiles: string[] = [];

  async function scan(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      // Check if excluded
      if (isExcluded(relativePath, excludePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        markdownFiles.push(relativePath);
      }
    }
  }

  await scan(rootDir);
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

async function collectDocuments(options?: IngestOptions): Promise<Document[]> {
  const rootDir = resolveRootDir(options);
  const documents: Document[] = [];
  const chunkSize = options?.chunkSize ?? 600;
  const chunkOverlap = options?.chunkOverlap ?? 80;

  let filesToProcess: SourceDefinition[] = [];

  // Manual mode: use includePaths if provided
  if (options?.includePaths && options.includePaths.length > 0) {
    filesToProcess = DEFAULT_SOURCES.filter(source =>
      options.includePaths!.includes(source.relativePath)
    );
    console.log(`📋 Manual mode: Processing ${filesToProcess.length} specified files`);
  }
  // Auto-discovery mode (default)
  else if (options?.autoDiscover !== false) {
    const excludePatterns = options?.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS;
    console.log('🔍 Auto-discovering markdown files...');

    const discoveredFiles = await scanMarkdownFiles(rootDir, excludePatterns);
    console.log(`   Found ${discoveredFiles.length} markdown files`);

    filesToProcess = discoveredFiles.map(relativePath => ({
      source: categorizeSource(relativePath),
      relativePath,
    }));
  }
  // Fallback to default sources if auto-discovery is explicitly disabled
  else {
    filesToProcess = DEFAULT_SOURCES;
    console.log(`📋 Using default sources: ${filesToProcess.length} files`);
  }

  const stats = new Map<string, number>();

  for (const sourceDef of filesToProcess) {
    const absolutePath = path.join(rootDir, sourceDef.relativePath);
    const markdown = await readFileIfExists(absolutePath);
    if (!markdown) {
      console.warn(`⚠️  Skipping missing file: ${sourceDef.relativePath}`);
      continue;
    }

    const chunks = chunkMarkdown(markdown, sourceDef.source, sourceDef.relativePath, {
      chunkSize,
      chunkOverlap,
    });
    documents.push(...chunks);

    // Track statistics
    const count = stats.get(sourceDef.source) ?? 0;
    stats.set(sourceDef.source, count + chunks.length);
  }

  // Log statistics
  if (stats.size > 0) {
    console.log('📊 Ingestion statistics:');
    for (const [source, count] of Array.from(stats.entries()).sort()) {
      console.log(`   ${source}: ${count} chunks`);
    }
  }

  return documents;
}

export async function ingestDocumentation(options?: IngestOptions): Promise<IngestResult> {
  console.log('📚 Ingesting documentation into vector store...\n');

  const embedder = new TransformersEmbedder();
  const store = new InMemoryVectorStore(embedder);

  const documents = await collectDocuments(options);
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
