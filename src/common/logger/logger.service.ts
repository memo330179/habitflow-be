import { Injectable, LoggerService, Scope } from '@nestjs/common';

interface LogContext {
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService implements LoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: LogContext) {
    this.printMessage('LOG', message, context);
  }

  error(message: string, trace?: string, context?: LogContext) {
    this.printMessage('ERROR', message, context);
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: string, context?: LogContext) {
    this.printMessage('WARN', message, context);
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.printMessage('DEBUG', message, context);
    }
  }

  verbose(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.printMessage('VERBOSE', message, context);
    }
  }

  private printMessage(level: string, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const ctx = this.context ? `[${this.context}]` : '';
    const contextStr = context ? JSON.stringify(context) : '';

    console.log(`[${timestamp}] [${level}] ${ctx} ${message} ${contextStr}`);
  }
}
