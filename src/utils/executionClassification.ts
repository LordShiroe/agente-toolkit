import { Tool } from '../types/Tool';

/**
 * Assess the complexity of a request based on message and tools
 */
export function assessComplexity(message: string, tools: Tool[]): 'simple' | 'medium' | 'complex' {
  let score = 0;

  // Message length complexity
  if (message.length > 200) score += 1;
  if (message.length > 500) score += 1;

  // Tool count complexity
  score += Math.min(tools.length - 1, 2); // 0-2 points for additional tools

  // Pattern complexity indicators
  if (hasSequentialPattern(message)) score += 1;
  if (hasParallelPattern(message)) score += 1;
  if (hasConditionalPattern(message)) score += 2;

  // Return classification
  if (score <= 1) return 'simple';
  if (score <= 3) return 'medium';
  return 'complex';
}

/**
 * Detect sequential execution patterns in the message
 */
function hasSequentialPattern(message: string): boolean {
  return /\b(then|after|once|next|step|first|finally)\b/i.test(message);
}

/**
 * Detect parallel execution patterns in the message
 */
function hasParallelPattern(message: string): boolean {
  const hasParallelWords = /\b(and|also|simultaneously|both|each|all)\b/i.test(message);
  const hasMultipleItems = message.split(',').length > 2 || message.split(' and ').length > 2;
  return hasParallelWords && hasMultipleItems;
}

/**
 * Detect conditional/complex logic patterns
 */
function hasConditionalPattern(message: string): boolean {
  return /\b(if|when|depending|based on|condition|varies)\b/i.test(message);
}

/**
 * Categorize the reason for execution fallback
 */
export function categorizeFallbackReason(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('token') || message.includes('context')) return 'context_limit';
  if (message.includes('timeout') || message.includes('time')) return 'timeout';
  if (message.includes('tool') && message.includes('not found')) return 'tool_error';
  if (message.includes('rate') || message.includes('limit')) return 'rate_limit';
  if (message.includes('network') || message.includes('connection')) return 'network_error';

  return 'execution_error';
}

/**
 * Generate a unique execution ID
 */
export function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}
