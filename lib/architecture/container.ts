/**
 * 依存性注入コンテナ
 * Inversion of Control (IoC) パターンの実装
 * エンタープライズレベルの依存関係管理
 */

import { logger } from '@/lib/logger'

// 依存性のライフサイクル管理
export enum ServiceLifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped',
}

// サービス記述子
export interface ServiceDescriptor<T = any> {
  token: ServiceToken<T>
  factory: ServiceFactory<T>
  lifetime: ServiceLifetime
  dependencies?: ServiceToken<any>[]
}

// サービストークン（型安全な識別子）
export class ServiceToken<T = any> {
  // Type phantom for compile-time type safety
  private readonly _phantom!: T
  
  constructor(
    public readonly name: string,
    public readonly description?: string
  ) {}
  
  toString(): string {
    return this.name
  }
}

// サービスファクトリー
export type ServiceFactory<T> = (container: Container) => T | Promise<T>

// スコープ付きサービスコンテナ
export interface ScopedContainer {
  get<T>(token: ServiceToken<T>): Promise<T>
  dispose(): Promise<void>
}

// メインDIコンテナ
export class Container {
  private readonly services = new Map<string, ServiceDescriptor>()
  private readonly singletonInstances = new Map<string, any>()
  private readonly scopedContainers = new WeakSet<ScopedContainer>()
  
  /**
   * サービスを登録
   */
  register<T>(descriptor: ServiceDescriptor<T>): this {
    const tokenName = descriptor.token.toString()
    
    if (this.services.has(tokenName)) {
      logger.warn(`Service ${tokenName} is already registered. Overwriting.`)
    }
    
    this.services.set(tokenName, descriptor)
    logger.debug(`Service registered: ${tokenName} (${descriptor.lifetime})`)
    
    return this
  }
  
  /**
   * シングルトンサービスを登録
   */
  registerSingleton<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    dependencies?: ServiceToken<any>[]
  ): this {
    return this.register({
      token,
      factory,
      lifetime: ServiceLifetime.SINGLETON,
      dependencies,
    })
  }
  
  /**
   * トランジェントサービスを登録
   */
  registerTransient<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    dependencies?: ServiceToken<any>[]
  ): this {
    return this.register({
      token,
      factory,
      lifetime: ServiceLifetime.TRANSIENT,
      dependencies,
    })
  }
  
  /**
   * スコープ付きサービスを登録
   */
  registerScoped<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    dependencies?: ServiceToken<any>[]
  ): this {
    return this.register({
      token,
      factory,
      lifetime: ServiceLifetime.SCOPED,
      dependencies,
    })
  }
  
  /**
   * サービスを取得
   */
  async get<T>(token: ServiceToken<T>): Promise<T> {
    const tokenName = token.toString()
    const descriptor = this.services.get(tokenName)
    
    if (!descriptor) {
      throw new ServiceNotFoundError(tokenName)
    }
    
    return this.createInstance(descriptor)
  }
  
  /**
   * スコープ付きコンテナを作成
   */
  createScope(): ScopedContainer {
    const scopedInstances = new Map<string, any>()
    
    const scopedContainer: ScopedContainer = {
      get: async <T>(token: ServiceToken<T>): Promise<T> => {
        const tokenName = token.toString()
        const descriptor = this.services.get(tokenName)
        
        if (!descriptor) {
          throw new ServiceNotFoundError(tokenName)
        }
        
        // スコープ付きサービスの場合はスコープ内でインスタンス管理
        if (descriptor.lifetime === ServiceLifetime.SCOPED) {
          if (scopedInstances.has(tokenName)) {
            return scopedInstances.get(tokenName)
          }
          
          const instance = await this.createInstance(descriptor, scopedContainer)
          scopedInstances.set(tokenName, instance)
          return instance
        }
        
        // その他はメインコンテナから取得
        return this.createInstance(descriptor, scopedContainer)
      },
      
      dispose: async (): Promise<void> => {
        // Disposableインターfaces実装サービスの破棄
        for (const [tokenName, instance] of scopedInstances.entries()) {
          if (instance && typeof instance.dispose === 'function') {
            try {
              await instance.dispose()
              logger.debug(`Disposed scoped service: ${tokenName}`)
            } catch (error) {
              logger.error(`Failed to dispose service ${tokenName}:`, error)
            }
          }
        }
        scopedInstances.clear()
      }
    }
    
    this.scopedContainers.add(scopedContainer)
    return scopedContainer
  }
  
  /**
   * インスタンス作成（循環依存検出付き）
   */
  private async createInstance<T>(
    descriptor: ServiceDescriptor<T>,
    scopedContainer?: ScopedContainer,
    resolutionPath: string[] = []
  ): Promise<T> {
    const tokenName = descriptor.token.toString()
    
    // 循環依存検出
    if (resolutionPath.includes(tokenName)) {
      throw new CircularDependencyError(resolutionPath.concat(tokenName))
    }
    
    // シングルトンキャッシュチェック
    if (descriptor.lifetime === ServiceLifetime.SINGLETON) {
      if (this.singletonInstances.has(tokenName)) {
        return this.singletonInstances.get(tokenName)
      }
    }
    
    const newResolutionPath = [...resolutionPath, tokenName]
    
    try {
      // 依存関係を解決
      const resolvedDependencies: any[] = []
      if (descriptor.dependencies) {
        for (const dependency of descriptor.dependencies) {
          const depInstance = scopedContainer
            ? await scopedContainer.get(dependency)
            : await this.get(dependency)
          resolvedDependencies.push(depInstance)
        }
      }
      
      // インスタンス作成
      const container = scopedContainer || this
      const instance = await descriptor.factory(container)
      
      // シングルトンの場合はキャッシュ
      if (descriptor.lifetime === ServiceLifetime.SINGLETON) {
        this.singletonInstances.set(tokenName, instance)
      }
      
      logger.debug(`Service instantiated: ${tokenName}`)
      return instance
      
    } catch (error) {
      logger.error(`Failed to create service ${tokenName}:`, error)
      throw new ServiceInstantiationError(tokenName, error)
    }
  }
  
  /**
   * 全サービスの診断情報を取得
   */
  getDiagnostics(): ServiceDiagnostics {
    const registeredServices = Array.from(this.services.entries()).map(([name, descriptor]) => ({
      name,
      lifetime: descriptor.lifetime,
      dependencies: descriptor.dependencies?.map(dep => dep.toString()) || [],
      isInstantiated: descriptor.lifetime === ServiceLifetime.SINGLETON 
        ? this.singletonInstances.has(name)
        : false,
    }))
    
    return {
      registeredServices,
      singletonCount: this.singletonInstances.size,
      totalRegistered: this.services.size,
    }
  }
  
  /**
   * 全リソースを破棄
   */
  async dispose(): Promise<void> {
    logger.info('Disposing container and all services...')
    
    // スコープ付きコンテナの破棄
    for (const scopedContainer of this.scopedContainers) {
      await scopedContainer.dispose()
    }
    
    // シングルトンサービスの破棄
    for (const [tokenName, instance] of this.singletonInstances.entries()) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          await instance.dispose()
          logger.debug(`Disposed singleton service: ${tokenName}`)
        } catch (error) {
          logger.error(`Failed to dispose service ${tokenName}:`, error)
        }
      }
    }
    
    this.singletonInstances.clear()
    this.services.clear()
    
    logger.info('Container disposed successfully')
  }
}

// 診断情報の型定義
export interface ServiceDiagnostics {
  registeredServices: Array<{
    name: string
    lifetime: ServiceLifetime
    dependencies: string[]
    isInstantiated: boolean
  }>
  singletonCount: number
  totalRegistered: number
}

// Disposableインターフェース
export interface Disposable {
  dispose(): Promise<void> | void
}

// カスタムエラー
export class ServiceNotFoundError extends Error {
  constructor(serviceName: string) {
    super(`Service not found: ${serviceName}`)
    this.name = 'ServiceNotFoundError'
  }
}

export class CircularDependencyError extends Error {
  constructor(resolutionPath: string[]) {
    super(`Circular dependency detected: ${resolutionPath.join(' -> ')}`)
    this.name = 'CircularDependencyError'
  }
}

export class ServiceInstantiationError extends Error {
  constructor(serviceName: string, cause: any) {
    super(`Failed to instantiate service: ${serviceName}`)
    this.name = 'ServiceInstantiationError'
    this.cause = cause
  }
}

// グローバルコンテナインスタンス
export const container = new Container()

// ヘルパー関数
export function createServiceToken<T>(
  name: string, 
  description?: string
): ServiceToken<T> {
  return new ServiceToken<T>(name, description)
}