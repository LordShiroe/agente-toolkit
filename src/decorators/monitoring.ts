import { AgentLogger } from '../interfaces/AgentLogger';
import { assessComplexity, generateExecutionId } from '../utils/executionClassification';
import { ExecutionContext } from '../executionEngine';

interface ExecutionMetrics {
  id: string;
  startTime: number;
  method: 'native' | 'planned';
  complexity: 'simple' | 'medium' | 'complex';
  requestLength: number;
  toolCount: number;
}

/**
 * Decorator to monitor execution lifecycle with structured logging
 */
export function withExecutionMonitoring(
  target: any,
  methodName: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (this: any, ...args: any[]) {
    // Get logger from the instance - assumes the instance has a `logger` property
    const logger = this.logger as AgentLogger;
    if (!logger) {
      throw new Error(
        'Instance must have a logger property to use withExecutionMonitoring decorator'
      );
    }

    const metrics = startMonitoring(args, logger);

    // Store execution ID for use by other decorators
    this._currentExecutionId = metrics.id;
    this._currentExecutionStartTime = metrics.startTime;

    try {
      const result = await originalMethod.apply(this, args);
      logExecutionSuccess(metrics, result, logger);
      return result;
    } catch (error) {
      logExecutionFailure(metrics, error as Error, logger);
      throw error;
    } finally {
      // Clean up
      delete this._currentExecutionId;
      delete this._currentExecutionStartTime;
    }
  };
}

/**
 * Start monitoring and log execution start event
 */
function startMonitoring(args: any[], logger: AgentLogger): ExecutionMetrics {
  // Extract execution context from first argument
  const context: ExecutionContext = args[0];

  const metrics: ExecutionMetrics = {
    id: generateExecutionId(),
    startTime: Date.now(),
    method: context.model.supportsNativeTools ? 'native' : 'planned',
    complexity: assessComplexity(context.message, context.tools),
    requestLength: context.message.length,
    toolCount: context.tools.length,
  };

  logger.info('execution_start', {
    execution_id: metrics.id,
    method: metrics.method,
    complexity: metrics.complexity,
    request_length: metrics.requestLength,
    tool_count: metrics.toolCount,
    timestamp: metrics.startTime,
  });

  return metrics;
}

/**
 * Log successful execution completion
 */
function logExecutionSuccess(metrics: ExecutionMetrics, result: string, logger: AgentLogger): void {
  const duration = Date.now() - metrics.startTime;

  logger.info('execution_complete', {
    execution_id: metrics.id,
    method: metrics.method,
    success: true,
    duration_ms: duration,
    response_length: result.length,
    complexity: metrics.complexity,
  });
}

/**
 * Log failed execution
 */
function logExecutionFailure(metrics: ExecutionMetrics, error: Error, logger: AgentLogger): void {
  const duration = Date.now() - metrics.startTime;

  logger.error('execution_failed', {
    execution_id: metrics.id,
    method: metrics.method,
    success: false,
    duration_ms: duration,
    error_message: error.message,
    complexity: metrics.complexity,
  });
}
