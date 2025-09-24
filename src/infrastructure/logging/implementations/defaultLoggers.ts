import { AgentLogger } from '../interfaces/AgentLogger';

/**
 * Console-based logger implementation.
 * Outputs structured logs to console with optional formatting.
 */
export class ConsoleLogger implements AgentLogger {
  private enableTimestamps: boolean;
  private enableColors: boolean;

  constructor(options: { enableTimestamps?: boolean; enableColors?: boolean } = {}) {
    this.enableTimestamps = options.enableTimestamps ?? true;
    this.enableColors = options.enableColors ?? true;
  }

  info(message: string, meta?: any): void {
    this.log('INFO', message, meta, this.enableColors ? '\x1b[36m' : ''); // Cyan
  }

  warn(message: string, meta?: any): void {
    this.log('WARN', message, meta, this.enableColors ? '\x1b[33m' : ''); // Yellow
  }

  error(message: string, meta?: any): void {
    this.log('ERROR', message, meta, this.enableColors ? '\x1b[31m' : ''); // Red
  }

  debug(message: string, meta?: any): void {
    this.log('DEBUG', message, meta, this.enableColors ? '\x1b[90m' : ''); // Gray
  }

  private log(level: string, message: string, meta?: any, color: string = ''): void {
    const reset = this.enableColors ? '\x1b[0m' : '';
    const timestamp = this.enableTimestamps ? new Date().toISOString() : '';

    let output = `${color}${timestamp ? `[${timestamp}] ` : ''}[${level}] ${message}${reset}`;

    if (meta && Object.keys(meta).length > 0) {
      output += `\n${JSON.stringify(meta, null, 2)}`;
    }

    console.log(output);
  }
}

/**
 * Silent logger implementation that discards all log messages.
 * Useful for testing or when logging should be completely disabled.
 */
export class SilentLogger implements AgentLogger {
  info(message: string, meta?: any): void {
    // Intentionally empty
  }

  warn(message: string, meta?: any): void {
    // Intentionally empty
  }

  error(message: string, meta?: any): void {
    // Intentionally empty
  }

  debug(message: string, meta?: any): void {
    // Intentionally empty
  }
}

/**
 * Creates a default logger instance suitable for most use cases.
 * Uses ConsoleLogger with reasonable defaults.
 */
export function createDefaultLogger(): AgentLogger {
  return new ConsoleLogger({ enableTimestamps: true, enableColors: true });
}
