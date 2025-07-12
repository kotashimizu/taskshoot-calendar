/**
 * ロガーシステム
 * 開発環境と本番環境で適切なログ出力を行う
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private isDevelopment: boolean;
  private minLevel: LogLevel;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;

    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      // eslint-disable-next-line no-console
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorData =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error;

      // eslint-disable-next-line no-console
      console.error(this.formatMessage('ERROR', message, errorData));

      // 本番環境では外部ログサービスに送信（将来的に実装）
      if (!this.isDevelopment) {
        // TODO: 外部ログサービス（Sentry、LogRocket等）に送信
      }
    }
  }

  // 認証関連の特別なログ
  authEvent(event: string, details?: any): void {
    this.info(`Auth: ${event}`, details);
  }

  // パフォーマンス計測
  performance(operation: string, duration: number): void {
    this.debug(`Performance: ${operation} took ${duration}ms`);
  }
}

export const logger = new Logger();

/**
 * パフォーマンス計測デコレータ
 */
export function measurePerformance<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      logger.performance(operation, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`${operation} failed after ${duration}ms`, error);
      throw error;
    }
  }) as T;
}
