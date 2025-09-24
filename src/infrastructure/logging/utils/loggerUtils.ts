import { AgentLogger } from '../interfaces/AgentLogger';

/**
 * Utility class that provides specialized logging methods using the basic AgentLogger interface.
 * This helps maintain rich logging semantics while using the injectable logger pattern.
 */
export class LoggerUtils {
  constructor(private logger: AgentLogger) {}

  logPrompt(prompt: string, meta?: any): void {
    this.logger.debug('Sending prompt to model', {
      prompt: this.truncateForLog(prompt, 100),
      ...meta,
    });
  }

  logModelResponse(response: string, meta?: any): void {
    this.logger.debug('Received model response', {
      response: this.truncateForLog(response, 100),
      ...meta,
    });
  }

  logPlanCreation(message: string, tools: any[], plan: any): void {
    this.logger.info('Created execution plan', {
      userMessage: message,
      availableTools: tools.map(t => t.name),
      planSteps: plan.steps?.length || 0,
    });
  }

  logToolExecution(toolName: string, params: any, result: any, duration?: number): void {
    this.logger.info(`Executed tool: ${toolName}`, {
      tool: toolName,
      params: typeof params === 'object' ? Object.keys(params) : params,
      result: this.truncateForLog(String(result), 50),
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  logParameterResolution(stepId: string, originalParams: any, resolvedParams: any): void {
    this.logger.debug(`Resolved parameters for ${stepId}`, {
      stepId,
      original: originalParams,
      resolved: resolvedParams,
    });
  }

  logMemoryOperation(operation: string, details: any): void {
    this.logger.debug(`Memory operation: ${operation}`, details);
  }

  logValidationError(toolName: string, errors: any): void {
    this.logger.warn(`Parameter validation failed for ${toolName}`, {
      tool: toolName,
      errors,
    });
  }

  logAgentStart(agentType?: string): void {
    this.logger.info('Agent session started', { agentType });
  }

  logAgentEnd(): void {
    this.logger.info('Agent session ended');
  }

  logRunStart(meta?: any): void {
    this.logger.info('Run started', meta);
  }

  logRunEnd(meta?: any): void {
    this.logger.info('Run ended', meta);
  }

  logStepStart(stepId: string, toolName: string, meta?: any): void {
    this.logger.debug(`Step started: ${stepId}`, { stepId, toolName, ...meta });
  }

  logStepEnd(stepId: string, toolName: string, durationMs?: number, meta?: any): void {
    this.logger.info(`Step ended: ${stepId}`, { stepId, toolName, duration: durationMs, ...meta });
  }

  private truncateForLog(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.substring(0, maxLength)}...`;
  }
}
