import stringSimilarity from 'string-similarity';
export interface Memory {
  id: string;
  type: 'conversation' | 'fact' | 'tool_result' | 'system';
  content: string;
  timestamp: Date;
  importance: number; // 0-1 scale, where 1 is most important
  metadata?: Record<string, any>;
}

export interface MemoryManager {
  addMemory(memory: Omit<Memory, 'id' | 'timestamp'>): void;
  getRelevantMemories(context: string, maxCount?: number): Memory[];
  getMemoryByType(type: Memory['type']): Memory[];
  getAllMemories(): Memory[];
  getMemoryCount(): number;
  pruneMemories(): void;
}

export class SlidingWindowMemoryManager implements MemoryManager {
  private memories: Memory[] = [];
  private maxMemories: number;
  private maxTokensPerMemory: number;

  constructor(maxMemories = 50, maxTokensPerMemory = 200) {
    this.maxMemories = maxMemories;
    this.maxTokensPerMemory = maxTokensPerMemory;
  }

  addMemory(memory: Omit<Memory, 'id' | 'timestamp'>): void {
    // Truncate content if too long (rough token estimation: 1 token ≈ 4 characters)
    let content = memory.content;
    const estimatedTokens = content.length / 4;
    if (estimatedTokens > this.maxTokensPerMemory) {
      content = content.substring(0, this.maxTokensPerMemory * 4) + '...';
    }

    const newMemory: Memory = {
      ...memory,
      content,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.memories.push(newMemory);
    this.pruneMemories();
  }

  getRelevantMemories(context: string, maxCount = 10): Memory[] {
    if (this.memories.length === 0) return [];

    // Sort by relevance score (combination of relevance + recency + importance)
    const scoredMemories = this.memories.map(memory => ({
      memory,
      score: this.calculateRelevanceScore(memory, context),
    }));

    return scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCount)
      .map(item => item.memory);
  }

  getMemoryByType(type: Memory['type']): Memory[] {
    return this.memories.filter(memory => memory.type === type);
  }

  getAllMemories(): Memory[] {
    return [...this.memories];
  }

  getMemoryCount(): number {
    return this.memories.length;
  }

  pruneMemories(): void {
    if (this.memories.length <= this.maxMemories) return;

    // Calculate retention scores for all memories
    const scoredMemories = this.memories.map(memory => ({
      memory,
      retentionScore: this.calculateRetentionScore(memory),
    }));

    // Keep the top memories based on retention score
    this.memories = scoredMemories
      .sort((a, b) => b.retentionScore - a.retentionScore)
      .slice(0, this.maxMemories)
      .map(item => item.memory);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private calculateRelevanceScore(memory: Memory, context: string): number {
    const relevanceScore = this.calculateContentRelevance(memory.content, context);
    const recencyScore = this.calculateRecencyScore(memory.timestamp);
    const importanceScore = memory.importance;

    // Weighted combination: 40% relevance, 30% importance, 30% recency
    return relevanceScore * 0.4 + importanceScore * 0.3 + recencyScore * 0.3;
  }

  private calculateRetentionScore(memory: Memory): number {
    const recencyScore = this.calculateRecencyScore(memory.timestamp);
    const importanceScore = memory.importance;

    // For retention, importance matters more than recency
    return importanceScore * 0.7 + recencyScore * 0.3;
  }

  private calculateContentRelevance(content: string, context: string): number {
    if (!context.trim()) return 0;
    const contextWords = context
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);
    const contentWords = content
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);

    if (contextWords.length === 0 || contentWords.length === 0) return 0;

    // For each context word, find the best fuzzy match in content words using string-similarity
    let totalScore = 0;
    for (const ctxWord of contextWords) {
      const bestScore = stringSimilarity.findBestMatch(ctxWord, contentWords).bestMatch.rating;
      totalScore += bestScore;
    }
    // Average best scores for all context words
    return totalScore / contextWords.length;
  }

  private calculateRecencyScore(timestamp: Date): number {
    const now = Date.now();
    const memoryTime = timestamp.getTime();
    const hoursSinceCreated = (now - memoryTime) / (1000 * 60 * 60);

    // Exponential decay: memories lose relevance over time
    // After 24 hours, recency score is ~0.5, after 48 hours ~0.25
    return Math.exp(-hoursSinceCreated / 24);
  }
}
