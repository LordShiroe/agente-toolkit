/**
 * Injectable logger interface for AI Agent library.
 * Consumers implement this interface to control where monitoring logs go.
 */
export interface AgentLogger {
  /**
   * Log informational messages
   */
  info(message: string, meta?: any): void;

  /**
   * Log warning messages
   */
  warn(message: string, meta?: any): void;

  /**
   * Log error messages
   */
  error(message: string, meta?: any): void;

  /**
   * Log debug messages
   */
  debug(message: string, meta?: any): void;
}

/**
 * Optional structured metadata for enhanced logging
 */
export interface LogMetadata {
  [key: string]: any;
}
