import winston from 'winston';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LoggerConfig {
  level: LogLevel;
  verbose: boolean;
  enableFileLogging?: boolean;
  logFile?: string;
}

class AgentLogger {
  private logger: winston.Logger;
  private isVerbose: boolean = false;

  constructor(config: LoggerConfig = { level: 'info', verbose: false }) {
    this.isVerbose = config.verbose;

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let output = `${timestamp} [${level}]: ${message}`;

            // Add metadata in verbose mode
            if (this.isVerbose && Object.keys(meta).length > 0) {
              output += '\n' + JSON.stringify(meta, null, 2);
            }

            return output;
          })
        ),
      }),
    ];

    if (config.enableFileLogging) {
      transports.push(
        new winston.transports.File({
          filename: config.logFile || 'agent.log',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        })
      );
    }

    this.logger = winston.createLogger({
      level: config.level,
      transports,
    });
  }

  setVerbose(verbose: boolean) {
    this.isVerbose = verbose;
  }

  // Core logging methods
  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }

  // Specialized logging methods for agent operations
  logPrompt(prompt: string, context?: any) {
    this.debug('Sending prompt to model', {
      prompt: this.isVerbose ? prompt : `${prompt.substring(0, 100)}...`,
      context,
    });
  }

  logModelResponse(response: string, meta?: any) {
    this.debug('Received model response', {
      response: this.isVerbose ? response : `${response.substring(0, 100)}...`,
      ...meta,
    });
  }

  logPlanCreation(message: string, tools: any[], plan: any) {
    this.info('Created execution plan', {
      userMessage: message,
      availableTools: tools.map(t => t.name),
      planSteps: plan.steps.length,
      plan: this.isVerbose ? plan : undefined,
    });
  }

  logToolExecution(toolName: string, params: any, result: any, duration?: number) {
    this.info(`Executed tool: ${toolName}`, {
      tool: toolName,
      params: this.isVerbose ? params : Object.keys(params),
      result: this.isVerbose ? result : `${String(result).substring(0, 50)}...`,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  logParameterResolution(stepId: string, originalParams: any, resolvedParams: any) {
    if (this.isVerbose) {
      this.debug(`Resolved parameters for ${stepId}`, {
        stepId,
        original: originalParams,
        resolved: resolvedParams,
      });
    }
  }

  logMemoryOperation(operation: string, details: any) {
    this.debug(`Memory operation: ${operation}`, details);
  }

  logValidationError(toolName: string, errors: any) {
    this.warn(`Parameter validation failed for ${toolName}`, {
      tool: toolName,
      errors,
    });
  }

  logAgentStart(agentType?: string) {
    this.info('Agent session started', { agentType });
  }

  logAgentEnd() {
    this.info('Agent session ended');
  }

  // Orchestration-focused helpers
  logRunStart(meta?: any) {
    this.info('Run started', meta);
  }

  logRunEnd(meta?: any) {
    this.info('Run ended', meta);
  }

  logStepStart(stepId: string, toolName: string, meta?: any) {
    this.debug(`Step started: ${stepId}`, { stepId, toolName, ...meta });
  }

  logStepEnd(stepId: string, toolName: string, durationMs?: number, meta?: any) {
    this.info(`Step ended: ${stepId}`, { stepId, toolName, duration: durationMs, ...meta });
  }
}

// Create a singleton instance
let loggerInstance: AgentLogger | null = null;

export function initializeLogger(config: LoggerConfig): AgentLogger {
  loggerInstance = new AgentLogger(config);
  return loggerInstance;
}

export function getLogger(): AgentLogger {
  if (!loggerInstance) {
    loggerInstance = new AgentLogger({ level: 'info', verbose: false });
  }
  return loggerInstance;
}

export { AgentLogger };
