type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogData {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: any;
}

class Logger {
  private formatLog(level: LogLevel, message: string, meta?: Record<string, any>): LogData {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  info(message: string, meta?: Record<string, any>) {
    console.log(JSON.stringify(this.formatLog('info', message, meta)));
  }

  warn(message: string, meta?: Record<string, any>) {
    console.warn(JSON.stringify(this.formatLog('warn', message, meta)));
  }

  error(message: string, meta?: Record<string, any>) {
    console.error(JSON.stringify(this.formatLog('error', message, meta)));
  }

  debug(message: string, meta?: Record<string, any>) {
    if (process.env.DEBUG === 'true') {
      console.log(JSON.stringify(this.formatLog('debug', message, meta)));
    }
  }
}

export const logger = new Logger();
