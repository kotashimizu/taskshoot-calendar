/**
 * アーキテクチャ統合エントリーポイント
 * Ultra-level Enterprise Architecture Integration
 */

// 基盤アーキテクチャ
export * from './container'
export * from './repositories' 
export * from './events'
export * from './validation'
export * from './cqrs'
export * from './services'

// ファクトリーパターン
export * from './factories'

// アーキテクチャパターン
export { StrategyPattern } from './patterns/strategy'
export { ObserverPattern } from './patterns/observer'
export { CommandPattern } from './patterns/command'
export { DecoratorPattern } from './patterns/decorator'

import { 
  initializeArchitecture,
  performHealthCheck,
  getArchitectureDiagnostics,
  SERVICE_TOKENS,
  createServiceScope,
  withServiceScope
} from './services'
import { logger } from '@/lib/logger'

// メインアーキテクチャクラス
export class TaskShootArchitecture {
  private isInitialized = false
  private shutdownHandler?: () => Promise<void>

  /**
   * アーキテクチャの初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Architecture is already initialized')
      return
    }

    try {
      logger.info('🚀 Initializing TaskShoot Enterprise Architecture...')
      
      // アーキテクチャ初期化
      this.shutdownHandler = await initializeArchitecture()
      
      // ヘルスチェック実行
      const healthCheck = await performHealthCheck()
      if (healthCheck.status !== 'healthy') {
        throw new Error(`Architecture health check failed: ${JSON.stringify(healthCheck.details)}`)
      }

      this.isInitialized = true
      logger.info('✅ TaskShoot Enterprise Architecture initialized successfully')

    } catch (error) {
      logger.error('❌ Failed to initialize architecture', { error })
      throw error
    }
  }

  /**
   * アーキテクチャのシャットダウン
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('Architecture is not initialized')
      return
    }

    try {
      logger.info('🔄 Shutting down TaskShoot Architecture...')
      
      if (this.shutdownHandler) {
        await this.shutdownHandler()
      }

      this.isInitialized = false
      logger.info('✅ TaskShoot Architecture shutdown completed')

    } catch (error) {
      logger.error('❌ Failed to shutdown architecture', { error })
      throw error
    }
  }

  /**
   * アーキテクチャヘルスチェック
   */
  async healthCheck() {
    return performHealthCheck()
  }

  /**
   * アーキテクチャ診断情報
   */
  async getDiagnostics() {
    return getArchitectureDiagnostics()
  }

  /**
   * サービススコープ作成
   */
  createScope() {
    if (!this.isInitialized) {
      throw new Error('Architecture must be initialized before creating scopes')
    }
    return createServiceScope()
  }

  /**
   * スコープ付きサービス実行
   */
  async withScope<T>(operation: (scope: any) => Promise<T>): Promise<T> {
    if (!this.isInitialized) {
      throw new Error('Architecture must be initialized before using scoped services')
    }
    return withServiceScope(operation)
  }

  /**
   * 初期化状態確認
   */
  get initialized(): boolean {
    return this.isInitialized
  }
}

// グローバルアーキテクチャインスタンス
export const architecture = new TaskShootArchitecture()

// アーキテクチャの自動初期化（開発環境用）
if (process.env.NODE_ENV === 'development') {
  // Next.jsの開発サーバー起動時に自動初期化
  if (typeof window === 'undefined') { // サーバーサイドでのみ実行
    architecture.initialize().catch((error) => {
      logger.error('Failed to auto-initialize architecture in development', { error })
    })
  }
}

// プロセス終了時のクリーンアップ
if (typeof window === 'undefined') { // サーバーサイドでのみ実行
  const cleanupHandlers = ['SIGINT', 'SIGTERM', 'SIGQUIT']
  
  cleanupHandlers.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down gracefully...`)
      
      try {
        await architecture.shutdown()
        process.exit(0)
      } catch (error) {
        logger.error('Error during graceful shutdown', { error })
        process.exit(1)
      }
    })
  })

  // 未処理の例外をキャッチ
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception', { error })
    
    try {
      await architecture.shutdown()
    } catch (shutdownError) {
      logger.error('Error during emergency shutdown', { shutdownError })
    }
    
    process.exit(1)
  })

  process.on('unhandledRejection', async (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason, promise })
    
    try {
      await architecture.shutdown()
    } catch (shutdownError) {
      logger.error('Error during emergency shutdown', { shutdownError })
    }
    
    process.exit(1)
  })
}

// アーキテクチャ統計とモニタリング
export class ArchitectureMonitor {
  private static metrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    startTime: Date.now()
  }

  static recordRequest(responseTime: number, success: boolean = true): void {
    this.metrics.requestCount++
    
    if (!success) {
      this.metrics.errorCount++
    }

    // 移動平均による応答時間計算
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + responseTime) / 2
  }

  static getMetrics() {
    const uptime = Date.now() - this.metrics.startTime
    
    return {
      ...this.metrics,
      uptime,
      errorRate: this.metrics.requestCount > 0 
        ? (this.metrics.errorCount / this.metrics.requestCount) * 100 
        : 0,
      requestsPerSecond: this.metrics.requestCount / (uptime / 1000)
    }
  }

  static reset(): void {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      startTime: Date.now()
    }
  }
}

// ヘルパー関数
export async function withArchitecture<T>(
  operation: (architecture: TaskShootArchitecture) => Promise<T>
): Promise<T> {
  if (!architecture.initialized) {
    await architecture.initialize()
  }
  
  return operation(architecture)
}

export async function getServiceFromArchitecture<T>(
  serviceToken: any
): Promise<T> {
  return withArchitecture(async (arch) => {
    return arch.withScope(async (scope) => {
      return scope.get(serviceToken)
    })
  })
}

// 開発ツール
export const DevTools = {
  /**
   * アーキテクチャの詳細状態を出力
   */
  async printArchitectureState(): Promise<void> {
    const diagnostics = await architecture.getDiagnostics()
    const monitor = ArchitectureMonitor.getMetrics()
    
    console.group('🏗️ TaskShoot Architecture State')
    console.log('📊 Health Check:', diagnostics.healthCheck)
    console.log('📈 Metrics:', monitor)
    console.log('🕐 Timestamp:', diagnostics.timestamp)
    console.log('⏱️ Uptime:', diagnostics.uptime + 's')
    console.log('💾 Memory:', diagnostics.memoryUsage)
    console.groupEnd()
  },

  /**
   * サービス解決テスト
   */
  async testServiceResolution(): Promise<void> {
    console.group('🔧 Service Resolution Test')
    
    const testServices = [
      SERVICE_TOKENS.TASK_SERVICE,
      SERVICE_TOKENS.CATEGORY_SERVICE,
      SERVICE_TOKENS.GOOGLE_CALENDAR_SERVICE,
      SERVICE_TOKENS.UNIT_OF_WORK,
      SERVICE_TOKENS.EVENT_DISPATCHER
    ]

    for (const token of testServices) {
      try {
        await getServiceFromArchitecture(token)
        console.log(`✅ ${token.name}: OK`)
      } catch (error) {
        console.log(`❌ ${token.name}: ${(error as Error).message}`)
      }
    }
    
    console.groupEnd()
  },

  /**
   * パフォーマンステスト
   */
  async performanceTest(iterations: number = 100): Promise<void> {
    console.group(`⚡ Performance Test (${iterations} iterations)`)
    
    const startTime = Date.now()
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const iterationStart = Date.now()
      
      try {
        await getServiceFromArchitecture(SERVICE_TOKENS.TASK_SERVICE)
        times.push(Date.now() - iterationStart)
      } catch (error) {
        console.error(`Iteration ${i} failed:`, error)
      }
    }

    const totalTime = Date.now() - startTime
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    console.log(`📊 Results:`)
    console.log(`   Total time: ${totalTime}ms`)
    console.log(`   Average: ${avgTime.toFixed(2)}ms`)
    console.log(`   Min: ${minTime}ms`)
    console.log(`   Max: ${maxTime}ms`)
    console.log(`   Throughput: ${(iterations / (totalTime / 1000)).toFixed(2)} ops/sec`)
    
    console.groupEnd()
  }
}

// TypeScript型ヘルパー
export type ArchitectureService<T> = T extends any ? T : never
export type ServiceScope = ReturnType<typeof createServiceScope>

// エクスポート用の便利な型定義
export type {
  IUnitOfWork,
  ITaskRepository,
  ICategoryRepository,
  IGoogleCalendarRepository
} from './repositories'

export type {
  CommandResult,
  QueryResult,
  Command,
  Query
} from './cqrs'

export type {
  ValidationResult,
  ValidationError,
  ValidationWarning
} from './validation'

export type {
  DomainEvent,
  EventHandler,
  EventDispatcher
} from './events'