import { AgentLogger } from '../../logging/interfaces/AgentLogger';
import { categorizeFallbackReason } from '../utils/executionClassification';

/**
 * Decorator to monitor native execution attempts and fallbacks
 */
export function withFallbackMonitoring(
  target: any,
  methodName: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (this: any, ...args: any[]) {
    const logger = this.logger as AgentLogger;
    if (!logger) {
      throw new Error(
        'Instance must have a logger property to use withFallbackMonitoring decorator'
      );
    }

    const executionId = this._currentExecutionId;

    if (!executionId) {
      // If no execution ID available, just run the method normally
      return await originalMethod.apply(this, args);
    }

    try {
      logger.info('native_attempt', {
        execution_id: executionId,
        timestamp: Date.now(),
      });

      const result = await originalMethod.apply(this, args);

      // Log native execution success with metrics
      logger.info('native_success', {
        execution_id: executionId,
        tool_calls: result.toolCalls?.length || 0,
        response_length: result.content?.length || result.length || 0,
        has_tool_calls: (result.toolCalls?.length || 0) > 0,
      });

      return result;
    } catch (error) {
      const fallbackReason = categorizeFallbackReason(error as Error);

      logger.warn('fallback_triggered', {
        execution_id: executionId,
        from_method: 'native',
        to_method: 'planned',
        reason: fallbackReason,
        error_message: (error as Error).message,
        timestamp: Date.now(),
      });

      throw error;
    }
  };
}

/**
 * Decorator to monitor planned execution
 */
export function withPlannedMonitoring(
  target: any,
  methodName: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (this: any, ...args: any[]) {
    const logger = this.logger as AgentLogger;
    if (!logger) {
      throw new Error(
        'Instance must have a logger property to use withPlannedMonitoring decorator'
      );
    }

    const executionId = this._currentExecutionId;

    if (!executionId) {
      // If no execution ID available, just run the method normally
      return await originalMethod.apply(this, args);
    }

    const planStartTime = Date.now();

    logger.info('planned_execution_start', {
      execution_id: executionId,
      timestamp: planStartTime,
    });

    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - planStartTime;

      logger.info('planned_execution_success', {
        execution_id: executionId,
        duration_ms: duration,
        response_length: result.length,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const duration = Date.now() - planStartTime;

      logger.error('planned_execution_failed', {
        execution_id: executionId,
        duration_ms: duration,
        error_message: (error as Error).message,
        timestamp: Date.now(),
      });

      throw error;
    }
  };
}
