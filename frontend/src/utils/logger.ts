/**
 * Production-ready logging service
 * Replaces console.log/error with structured logging and analytics
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  user_id?: string;
  session_id?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface LoggerConfig {
  level: LogLevel;
  enable_console: boolean;
  enable_storage: boolean;
  enable_analytics: boolean;
  max_stored_logs: number;
  storage_key: string;
}

class Logger {
  private config: LoggerConfig;
  private session_id: string;
  private logQueue: LogEntry[] = [];
  private flushTimeoutId: NodeJS.Timeout | null = null;

  private static instance: Logger | null = null;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      enable_console: process.env.NODE_ENV !== 'production',
      enable_storage: true,
      enable_analytics: process.env.NODE_ENV === 'production',
      max_stored_logs: 1000,
      storage_key: 'game-logs',
      ...config
    };

    this.session_id = this.generateSessionId();
    this.initializeErrorHandlers();
  }

  public static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeErrorHandlers(): void {
    // Capture unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('Uncaught error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection', {
          reason: event.reason,
          promise: event.promise
        });
      });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4
    };

    return levels[level] >= levels[this.config.level];
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    component?: string,
    action?: string
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      session_id: this.session_id,
      context,
      component,
      action,
      metadata: {
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        viewport: typeof window !== 'undefined' ? 
          `${window.innerWidth}x${window.innerHeight}` : undefined
      }
    };
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    component?: string,
    action?: string
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, component, action);

    // Console logging for development
    if (this.config.enable_console) {
      const consoleMethod = level === 'critical' ? 'error' : level;
      const method = console[consoleMethod] || console.log;
      
      if (context || component || action) {
        method(`[${level.toUpperCase()}] ${message}`, {
          component,
          action,
          context,
          timestamp: entry.timestamp
        });
      } else {
        method(`[${level.toUpperCase()}] ${message}`);
      }
    }

    // Store for analytics and debugging
    if (this.config.enable_storage) {
      this.queueLog(entry);
    }

    // Send to analytics service for critical errors
    if (this.config.enable_analytics && (level === 'error' || level === 'critical')) {
      this.sendToAnalytics(entry);
    }
  }

  private queueLog(entry: LogEntry): void {
    this.logQueue.push(entry);

    // Limit queue size
    if (this.logQueue.length > this.config.max_stored_logs) {
      this.logQueue = this.logQueue.slice(-this.config.max_stored_logs);
    }

    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimeoutId) return;

    this.flushTimeoutId = setTimeout(() => {
      this.flushLogs();
      this.flushTimeoutId = null;
    }, 5000); // Flush every 5 seconds
  }

  private flushLogs(): void {
    if (this.logQueue.length === 0) return;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const existingLogs = window.localStorage.getItem(this.config.storage_key);
        const logs = existingLogs ? JSON.parse(existingLogs) : [];

        logs.push(...this.logQueue);

        // Keep only recent logs
        const recentLogs = logs.slice(-this.config.max_stored_logs);

        window.localStorage.setItem(this.config.storage_key, JSON.stringify(recentLogs));
      }
    } catch (error) {
      // Log storage failures directly to console to avoid infinite loops
      console.error('[Logger] Failed to flush logs to localStorage:', error);
    }

    this.logQueue = [];
  }

  private async sendToAnalytics(entry: LogEntry): Promise<void> {
    try {
      // In a real implementation, this would send to your analytics service
      // For now, we'll just queue it for potential future sending
      if (typeof window !== 'undefined' && 'navigator' in window && 'sendBeacon' in navigator) {
        const payload = JSON.stringify(entry);
        // navigator.sendBeacon('/api/analytics/logs', payload);
      }
    } catch (error) {
      // Log analytics failures directly to console to avoid infinite loops
      console.error('[Logger] Failed to send analytics:', error);
    }
  }

  // Public logging methods
  public debug(message: string, context?: Record<string, any>, component?: string, action?: string): void {
    this.log('debug', message, context, component, action);
  }

  public info(message: string, context?: Record<string, any>, component?: string, action?: string): void {
    this.log('info', message, context, component, action);
  }

  public warn(message: string, context?: Record<string, any>, component?: string, action?: string): void {
    this.log('warn', message, context, component, action);
  }

  public error(message: string, context?: Record<string, any>, component?: string, action?: string): void {
    this.log('error', message, context, component, action);
  }

  public critical(message: string, context?: Record<string, any>, component?: string, action?: string): void {
    this.log('critical', message, context, component, action);
  }

  // Game-specific logging methods
  public logBattleEvent(event: string, context?: Record<string, any>): void {
    this.info(`Battle: ${event}`, context, 'BattleSystem', event);
  }

  public logUserAction(action: string, context?: Record<string, any>): void {
    this.info(`User: ${action}`, context, 'UserInterface', action);
  }

  public logPerformance(metric: string, value: number, context?: Record<string, any>): void {
    this.info(`Performance: ${metric}`, { ...context, value, metric }, 'Performance', metric);
  }

  public logAPICall(endpoint: string, method: string, duration: number, status: number): void {
    const level = status >= 400 ? 'error' : 'info';
    this.log(level, `API: ${method} ${endpoint}`, {
      endpoint,
      method,
      duration,
      status
    }, 'APIClient', `${method}_${endpoint}`);
  }

  // Utility methods
  public getStoredLogs(): LogEntry[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const logs = window.localStorage.getItem(this.config.storage_key);
        return logs ? JSON.parse(logs) : [];
      }
    } catch (error) {
      console.error('[Logger] Failed to retrieve logs from localStorage:', error);
      return [];
    }
    return [];
  }

  public clearLogs(): void {
    this.logQueue = [];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.config.storage_key);
      }
    } catch (error) {
      // Log clear failures directly to console to avoid infinite loops
      console.error('[Logger] Failed to clear logs from localStorage:', error);
    }
  }

  public setUserId(user_id: string): void {
    // Update all future logs with user ID
    this.session_id = `${user_id}_${this.session_id}`;
  }

  public setLogLevel(level: LogLevel): void {
    this.config.level = level;
  }

  public flush(): void {
    this.flushLogs();
  }
}

// Create singleton instance
const logger = Logger.getInstance();

// Export convenience functions
export const log = {
  debug: (message: string, context?: Record<string, any>, component?: string, action?: string) => 
    logger.debug(message, context, component, action),
  
  info: (message: string, context?: Record<string, any>, component?: string, action?: string) => 
    logger.info(message, context, component, action),
  
  warn: (message: string, context?: Record<string, any>, component?: string, action?: string) => 
    logger.warn(message, context, component, action),
  
  error: (message: string, context?: Record<string, any>, component?: string, action?: string) => 
    logger.error(message, context, component, action),
  
  critical: (message: string, context?: Record<string, any>, component?: string, action?: string) => 
    logger.critical(message, context, component, action),

  // Game-specific methods
  battle: (event: string, context?: Record<string, any>) => 
    logger.logBattleEvent(event, context),
  
  user: (action: string, context?: Record<string, any>) => 
    logger.logUserAction(action, context),
  
  performance: (metric: string, value: number, context?: Record<string, any>) => 
    logger.logPerformance(metric, value, context),
  
  api: (endpoint: string, method: string, duration: number, status: number) => 
    logger.logAPICall(endpoint, method, duration, status),

  // Utility methods
  set_user_id: (user_id: string) => logger.setUserId(user_id),
  set_level: (level: LogLevel) => logger.setLogLevel(level),
  get_logs: () => logger.getStoredLogs(),
  clear_logs: () => logger.clearLogs(),
  flush: () => logger.flush()
};

export { Logger, type LogLevel, type LogEntry };
export default logger;