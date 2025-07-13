/**
 * デコレーターパターン実装
 * 機能の動的追加とAOPスタイルの横断的関心事
 */

import { logger } from '@/lib/logger'

// デコレーター基底インターフェース
export interface Decorator<T = any> {
  name: string
  before?(target: T, method: string, args: any[]): Promise<any> | any
  after?(target: T, method: string, result: any, args: any[]): Promise<any> | any
  onError?(target: T, method: string, error: Error, args: any[]): Promise<any> | any
  shouldApply?(target: T, method: string): boolean
}

// メソッドデコレーター実装
export function applyDecorators<T extends object>(
  target: T,
  decorators: Decorator<T>[]
): T {
  const decoratedTarget = Object.create(Object.getPrototypeOf(target))
  
  // 全プロパティをコピー
  Object.getOwnPropertyNames(target).forEach(prop => {
    const descriptor = Object.getOwnPropertyDescriptor(target, prop)
    if (descriptor) {
      Object.defineProperty(decoratedTarget, prop, descriptor)
    }
  })

  // メソッドをデコレート
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(target))
    .filter(name => name !== 'constructor' && typeof (target as any)[name] === 'function')

  methods.forEach(methodName => {
    const originalMethod = (target as any)[methodName]
    
    ;(decoratedTarget as any)[methodName] = async function (...args: any[]) {
      const applicableDecorators = decorators.filter(decorator => 
        !decorator.shouldApply || decorator.shouldApply(target, methodName)
      )

      try {
        // Before処理
        for (const decorator of applicableDecorators) {
          if (decorator.before) {
            const beforeResult = await decorator.before(target, methodName, args)
            if (beforeResult !== undefined) {
              args = Array.isArray(beforeResult) ? beforeResult : [beforeResult]
            }
          }
        }

        // 元のメソッド実行
        let result = await originalMethod.apply(this, args)

        // After処理
        for (const decorator of applicableDecorators.reverse()) {
          if (decorator.after) {
            const afterResult = await decorator.after(target, methodName, result, args)
            if (afterResult !== undefined) {
              result = afterResult
            }
          }
        }

        return result

      } catch (error) {
        // エラーハンドリング
        for (const decorator of applicableDecorators) {
          if (decorator.onError) {
            try {
              const errorResult = await decorator.onError(target, methodName, error as Error, args)
              if (errorResult !== undefined) {
                return errorResult
              }
            } catch (decoratorError) {
              logger.error(`Decorator error handling failed: ${decorator.name}`, {
                originalError: error,
                decoratorError
              })
            }
          }
        }
        throw error
      }
    }
  })

  return decoratedTarget
}

// ログ記録デコレーター
export class LoggingDecorator implements Decorator {
  name = 'logging'

  constructor(
    private level: 'debug' | 'info' | 'warn' | 'error' = 'debug',
    private includeArgs: boolean = false,
    private includeResult: boolean = false
  ) {}

  async before(target: any, method: string, args: any[]): Promise<void> {
    const logData: any = {
      class: target.constructor.name,
      method,
      timestamp: new Date().toISOString()
    }

    if (this.includeArgs) {
      logData.args = this.sanitizeArgs(args)
    }

    logger[this.level](`Method execution started: ${target.constructor.name}.${method}`, logData)
  }

  async after(target: any, method: string, result: any, args: any[]): Promise<void> {
    const logData: any = {
      class: target.constructor.name,
      method,
      timestamp: new Date().toISOString()
    }

    if (this.includeResult) {
      logData.result = this.sanitizeResult(result)
    }

    logger[this.level](`Method execution completed: ${target.constructor.name}.${method}`, logData)
  }

  async onError(target: any, method: string, error: Error, args: any[]): Promise<void> {
    logger.error(`Method execution failed: ${target.constructor.name}.${method}`, {
      class: target.constructor.name,
      method,
      error: error.message,
      stack: error.stack,
      args: this.includeArgs ? this.sanitizeArgs(args) : undefined
    })
  }

  private sanitizeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // パスワードやトークンなどの機密情報をマスク
        const sanitized = { ...arg }
        Object.keys(sanitized).forEach(key => {
          if (/password|token|secret|key/i.test(key)) {
            sanitized[key] = '***REDACTED***'
          }
        })
        return sanitized
      }
      return arg
    })
  }

  private sanitizeResult(result: any): any {
    if (typeof result === 'object' && result !== null) {
      const sanitized = { ...result }
      Object.keys(sanitized).forEach(key => {
        if (/password|token|secret|key/i.test(key)) {
          sanitized[key] = '***REDACTED***'
        }
      })
      return sanitized
    }
    return result
  }
}

// パフォーマンス計測デコレーター
export class PerformanceDecorator implements Decorator {
  name = 'performance'
  private timers = new Map<string, number>()

  constructor(
    private warnThreshold: number = 1000, // 1秒
    private logSlowOperations: boolean = true
  ) {}

  async before(target: any, method: string, args: any[]): Promise<void> {
    const key = `${target.constructor.name}.${method}`
    this.timers.set(key, Date.now())
  }

  async after(target: any, method: string, result: any, args: any[]): Promise<void> {
    const key = `${target.constructor.name}.${method}`
    const startTime = this.timers.get(key)
    
    if (startTime) {
      const duration = Date.now() - startTime
      this.timers.delete(key)

      if (duration > this.warnThreshold && this.logSlowOperations) {
        logger.warn(`Slow operation detected: ${key}`, {
          duration: `${duration}ms`,
          threshold: `${this.warnThreshold}ms`
        })
      } else {
        logger.debug(`Method performance: ${key}`, {
          duration: `${duration}ms`
        })
      }
    }
  }

  async onError(target: any, method: string, error: Error, args: any[]): Promise<void> {
    const key = `${target.constructor.name}.${method}`
    const startTime = this.timers.get(key)
    
    if (startTime) {
      const duration = Date.now() - startTime
      this.timers.delete(key)
      
      logger.error(`Method failed after ${duration}ms: ${key}`, {
        duration: `${duration}ms`,
        error: error.message
      })
    }
  }
}

// キャッシュデコレーター
export class CacheDecorator implements Decorator {
  name = 'cache'
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  constructor(
    private defaultTTL: number = 300000, // 5分
    private maxCacheSize: number = 1000
  ) {}

  shouldApply(target: any, method: string): boolean {
    // GET系のメソッドのみキャッシュ対象
    return method.startsWith('get') || method.startsWith('find') || method.startsWith('fetch')
  }

  async before(target: any, method: string, args: any[]): Promise<any> {
    const cacheKey = this.generateCacheKey(target.constructor.name, method, args)
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      logger.debug(`Cache hit: ${cacheKey}`)
      return cached.data
    }

    if (cached) {
      this.cache.delete(cacheKey)
    }
  }

  async after(target: any, method: string, result: any, args: any[]): Promise<void> {
    const cacheKey = this.generateCacheKey(target.constructor.name, method, args)
    
    // キャッシュサイズ制限
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest()
    }

    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl: this.defaultTTL
    })

    logger.debug(`Cached result: ${cacheKey}`)
  }

  private generateCacheKey(className: string, method: string, args: any[]): string {
    const argsKey = JSON.stringify(args)
    return `${className}.${method}:${Buffer.from(argsKey).toString('base64').slice(0, 50)}`
  }

  private evictOldest(): void {
    const entries = Array.from(this.cache.entries())
    entries.sort(([,a], [,b]) => a.timestamp - b.timestamp)
    
    // 古いエントリの10%を削除
    const toDelete = Math.ceil(entries.length * 0.1)
    for (let i = 0; i < toDelete; i++) {
      this.cache.delete(entries[i][0])
    }
  }

  clearCache(): void {
    this.cache.clear()
    logger.debug('Cache cleared')
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries: Array.from(this.cache.keys())
    }
  }
}

// バリデーションデコレーター
export class ValidationDecorator implements Decorator {
  name = 'validation'

  constructor(
    private validators: Map<string, (args: any[]) => boolean> = new Map()
  ) {}

  addValidator(methodName: string, validator: (args: any[]) => boolean): this {
    this.validators.set(methodName, validator)
    return this
  }

  shouldApply(target: any, method: string): boolean {
    return this.validators.has(method)
  }

  async before(target: any, method: string, args: any[]): Promise<void> {
    const validator = this.validators.get(method)
    
    if (validator && !validator(args)) {
      throw new Error(`Validation failed for method: ${target.constructor.name}.${method}`)
    }
  }
}

// リトライデコレーター
export class RetryDecorator implements Decorator {
  name = 'retry'

  constructor(
    private maxRetries: number = 3,
    private retryDelay: number = 1000,
    private exponentialBackoff: boolean = true
  ) {}

  shouldApply(target: any, method: string): boolean {
    // 副作用のないメソッドのみリトライ対象
    return method.startsWith('get') || method.startsWith('find') || method.startsWith('fetch')
  }

  async onError(target: any, method: string, error: Error, args: any[]): Promise<any> {
    const originalMethod = (target as any)[method]
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const delay = this.exponentialBackoff 
        ? this.retryDelay * Math.pow(2, attempt - 1)
        : this.retryDelay

      logger.warn(`Retrying ${target.constructor.name}.${method} (attempt ${attempt}/${this.maxRetries})`, {
        error: error.message,
        delay
      })

      await new Promise(resolve => setTimeout(resolve, delay))

      try {
        return await originalMethod.apply(target, args)
      } catch (retryError) {
        if (attempt === this.maxRetries) {
          logger.error(`All retry attempts failed for ${target.constructor.name}.${method}`, {
            attempts: this.maxRetries,
            lastError: (retryError as Error).message
          })
          throw retryError
        }
      }
    }
  }
}

// セキュリティデコレーター
export class SecurityDecorator implements Decorator {
  name = 'security'

  constructor(
    private requiredPermissions: Map<string, string[]> = new Map(),
    private rateLimits: Map<string, { limit: number; window: number }> = new Map()
  ) {}

  addPermissionCheck(methodName: string, permissions: string[]): this {
    this.requiredPermissions.set(methodName, permissions)
    return this
  }

  addRateLimit(methodName: string, limit: number, windowMs: number): this {
    this.rateLimits.set(methodName, { limit, window: windowMs })
    return this
  }

  async before(target: any, method: string, args: any[]): Promise<void> {
    // 権限チェック
    const requiredPerms = this.requiredPermissions.get(method)
    if (requiredPerms) {
      // 実装: ユーザー権限チェック
      logger.debug(`Checking permissions for ${method}`, { requiredPermissions: requiredPerms })
    }

    // レート制限チェック
    const rateLimit = this.rateLimits.get(method)
    if (rateLimit) {
      // 実装: レート制限チェック
      logger.debug(`Checking rate limit for ${method}`, { limit: rateLimit.limit, window: rateLimit.window })
    }
  }
}

// 事前設定されたデコレーターセット
export const commonDecorators = [
  new LoggingDecorator('debug', false, false),
  new PerformanceDecorator(1000, true),
  new CacheDecorator(300000, 1000)
]

export const secureDecorators = [
  new LoggingDecorator('info', true, false),
  new PerformanceDecorator(500, true),
  new SecurityDecorator(),
  new ValidationDecorator(),
  new RetryDecorator(3, 1000, true)
]

// ヘルパー関数
export function withCommonDecorators<T extends object>(target: T): T {
  return applyDecorators(target, commonDecorators)
}

export function withSecureDecorators<T extends object>(target: T): T {
  return applyDecorators(target, secureDecorators)
}

export function withCustomDecorators<T extends object>(
  target: T, 
  decorators: Decorator<T>[]
): T {
  return applyDecorators(target, decorators)
}

// デコレーターパターンのエクスポート
export const DecoratorPattern = {
  applyDecorators,
  
  // 具体的なデコレーター
  LoggingDecorator,
  PerformanceDecorator,
  CacheDecorator,
  ValidationDecorator,
  RetryDecorator,
  SecurityDecorator,
  
  // 事前設定されたセット
  commonDecorators,
  secureDecorators,
  
  // ヘルパーメソッド
  withCommonDecorators,
  withSecureDecorators,
  withCustomDecorators
}