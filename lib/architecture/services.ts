/**
 * サービス登録とアーキテクチャ配線
 * 依存性注入コンテナの設定とサービス統合
 */

import { 
  container, 
  ServiceLifetime, 
  ServiceToken, 
  createServiceToken,
  Disposable
} from './container'
import {
  IUnitOfWork,
  ITaskRepository,
  ICategoryRepository,
  IGoogleCalendarRepository,
  createUnitOfWork,
  createTaskRepository,
  createCategoryRepository,
  createGoogleCalendarRepository
} from './repositories'
import {
  EventDispatcher,
  InMemoryEventDispatcher,
  eventDispatcher,
  setupEventHandlers
} from './events'
import {
  CommandBus,
  QueryBus,
  InMemoryCommandBus,
  InMemoryQueryBus,
  CQRSMediator,
  commandBus as globalCommandBus,
  queryBus as globalQueryBus,
  mediator as globalMediator
} from './cqrs'
import {
  taskValidator,
  categoryValidator,
  googleCalendarConfigValidator,
  Validator,
  ValidationMetrics
} from './validation'
import { GoogleCalendarClient, createGoogleCalendarClient, getGoogleCredentialsFromEnv } from '@/lib/google-calendar/client'
import { googleCalendarCache } from '@/lib/cache'
import { logger } from '@/lib/logger'

// サービストークン定義
export const SERVICE_TOKENS = {
  // 基盤サービス
  UNIT_OF_WORK: createServiceToken<IUnitOfWork>('IUnitOfWork', 'データアクセス統合管理'),
  EVENT_DISPATCHER: createServiceToken<EventDispatcher>('EventDispatcher', 'ドメインイベント管理'),
  COMMAND_BUS: createServiceToken<CommandBus>('CommandBus', 'コマンド処理'),
  QUERY_BUS: createServiceToken<QueryBus>('QueryBus', 'クエリ処理'),
  CQRS_MEDIATOR: createServiceToken<CQRSMediator>('CQRSMediator', 'CQRS仲介'),

  // リポジトリ
  TASK_REPOSITORY: createServiceToken<ITaskRepository>('ITaskRepository', 'タスクデータアクセス'),
  CATEGORY_REPOSITORY: createServiceToken<ICategoryRepository>('ICategoryRepository', 'カテゴリデータアクセス'),
  GOOGLE_CALENDAR_REPOSITORY: createServiceToken<IGoogleCalendarRepository>('IGoogleCalendarRepository', 'Google Calendarデータアクセス'),

  // バリデーター
  TASK_VALIDATOR: createServiceToken<Validator<any>>('TaskValidator', 'タスクバリデーション'),
  CATEGORY_VALIDATOR: createServiceToken<Validator<any>>('CategoryValidator', 'カテゴリバリデーション'),
  GOOGLE_CALENDAR_VALIDATOR: createServiceToken<Validator<any>>('GoogleCalendarValidator', 'Google Calendarバリデーション'),

  // 外部サービス
  GOOGLE_CALENDAR_CLIENT: createServiceToken<GoogleCalendarClient>('GoogleCalendarClient', 'Google Calendar API'),

  // アプリケーションサービス
  TASK_SERVICE: createServiceToken<TaskService>('TaskService', 'タスク管理サービス'),
  CATEGORY_SERVICE: createServiceToken<CategoryService>('CategoryService', 'カテゴリ管理サービス'),
  GOOGLE_CALENDAR_SERVICE: createServiceToken<GoogleCalendarService>('GoogleCalendarService', 'Google Calendar連携サービス'),
  NOTIFICATION_SERVICE: createServiceToken<NotificationService>('NotificationService', '通知サービス'),
  ANALYTICS_SERVICE: createServiceToken<AnalyticsService>('AnalyticsService', '分析サービス'),
} as const

// アプリケーションサービス実装

export class TaskService implements Disposable {
  constructor(
    private unitOfWork: IUnitOfWork,
    private eventDispatcher: EventDispatcher,
    private validator: Validator<any>
  ) {}

  async createTask(userId: string, taskData: any): Promise<any> {
    // バリデーション
    const validationResult = await this.validator.validate(taskData, {
      userId,
      operation: 'create',
      timestamp: new Date()
    })

    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`)
    }

    try {
      await this.unitOfWork.beginTransaction()

      const task = await this.unitOfWork.tasks.createForUser(userId, validationResult.data!)
      
      // イベント発行
      await this.eventDispatcher.dispatch({
        eventType: 'task.created',
        id: crypto.randomUUID(),
        occurredAt: new Date(),
        task,
        userId
      } as any)

      await this.unitOfWork.commit()
      return task

    } catch (error) {
      await this.unitOfWork.rollback()
      logger.error('Failed to create task', { userId, error })
      throw error
    }
  }

  async updateTask(userId: string, taskId: string, updates: any): Promise<any> {
    const validationResult = await this.validator.validate(updates, {
      userId,
      operation: 'update',
      timestamp: new Date()
    })

    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`)
    }

    try {
      await this.unitOfWork.beginTransaction()

      const previousTask = await this.unitOfWork.tasks.findByUserIdAndId(userId, taskId)
      if (!previousTask) {
        throw new Error('Task not found')
      }

      const updatedTask = await this.unitOfWork.tasks.updateForUser(userId, taskId, validationResult.data!)
      
      // イベント発行
      await this.eventDispatcher.dispatch({
        eventType: 'task.updated',
        id: crypto.randomUUID(),
        occurredAt: new Date(),
        task: updatedTask,
        previousTask,
        userId
      } as any)

      await this.unitOfWork.commit()
      return updatedTask

    } catch (error) {
      await this.unitOfWork.rollback()
      logger.error('Failed to update task', { userId, taskId, error })
      throw error
    }
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    try {
      await this.unitOfWork.beginTransaction()

      const task = await this.unitOfWork.tasks.findByUserIdAndId(userId, taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      await this.unitOfWork.tasks.deleteForUser(userId, taskId)
      
      // イベント発行
      await this.eventDispatcher.dispatch({
        eventType: 'task.deleted',
        id: crypto.randomUUID(),
        occurredAt: new Date(),
        taskId,
        task,
        userId
      } as any)

      await this.unitOfWork.commit()

    } catch (error) {
      await this.unitOfWork.rollback()
      logger.error('Failed to delete task', { userId, taskId, error })
      throw error
    }
  }

  async dispose(): Promise<void> {
    await this.unitOfWork.dispose()
  }
}

export class CategoryService implements Disposable {
  constructor(
    private unitOfWork: IUnitOfWork,
    private eventDispatcher: EventDispatcher,
    private validator: Validator<any>
  ) {}

  async createCategory(userId: string, categoryData: any): Promise<any> {
    const validationResult = await this.validator.validate(categoryData, {
      userId,
      operation: 'create',
      timestamp: new Date()
    })

    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`)
    }

    try {
      await this.unitOfWork.beginTransaction()
      const category = await this.unitOfWork.categories.createForUser(userId, validationResult.data!)
      await this.unitOfWork.commit()
      return category
    } catch (error) {
      await this.unitOfWork.rollback()
      throw error
    }
  }

  async dispose(): Promise<void> {
    await this.unitOfWork.dispose()
  }
}

export class GoogleCalendarService implements Disposable {
  constructor(
    private unitOfWork: IUnitOfWork,
    private eventDispatcher: EventDispatcher,
    private validator: Validator<any>,
    private googleCalendarClient: GoogleCalendarClient
  ) {}

  async connectCalendar(userId: string, authCode: string, state: string): Promise<any> {
    try {
      await this.unitOfWork.beginTransaction()

      // Google Calendar認証処理
      const tokens = await this.googleCalendarClient.getTokenFromCode(authCode)
      this.googleCalendarClient.setTokens(tokens)

      // カレンダー一覧取得
      const calendars = await this.googleCalendarClient.getCalendarList()

      // 設定保存
      const config = await this.unitOfWork.googleCalendar.createForUser(userId, {
        enabled: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        sync_status: 'idle',
        last_sync_at: new Date().toISOString(),
        selected_calendars: calendars.calendars.slice(0, 5).map(cal => cal.id)
      })

      // イベント発行
      await this.eventDispatcher.dispatch({
        eventType: 'google_calendar.connected',
        id: crypto.randomUUID(),
        occurredAt: new Date(),
        userId,
        calendarCount: calendars.calendars.length
      } as any)

      await this.unitOfWork.commit()
      return { config, calendars: calendars.calendars }

    } catch (error) {
      await this.unitOfWork.rollback()
      logger.error('Failed to connect Google Calendar', { userId, error })
      throw error
    }
  }

  async dispose(): Promise<void> {
    await this.unitOfWork.dispose()
  }
}

export class NotificationService implements Disposable {
  constructor(private eventDispatcher: EventDispatcher) {}

  async sendTaskReminder(userId: string, taskId: string): Promise<void> {
    // TODO: 通知実装
    logger.info('Task reminder sent', { userId, taskId })
  }

  async dispose(): Promise<void> {
    // リソースクリーンアップ
  }
}

export class AnalyticsService implements Disposable {
  constructor(private unitOfWork: IUnitOfWork) {}

  async getProductivityMetrics(userId: string): Promise<any> {
    const stats = await this.unitOfWork.tasks.getStats(userId)
    const overdueTasks = await this.unitOfWork.tasks.findOverdue(userId)
    
    return {
      taskStats: stats,
      overdueCount: overdueTasks.length,
      productivityScore: this.calculateProductivityScore(stats),
      trends: await this.calculateTrends(userId)
    }
  }

  private calculateProductivityScore(stats: any): number {
    if (stats.total_tasks === 0) return 0
    return Math.round((stats.completed_tasks / stats.total_tasks) * 100)
  }

  private async calculateTrends(userId: string): Promise<any> {
    // TODO: トレンド分析実装
    return {
      weeklyCompletionRate: 0,
      averageTaskTime: 0,
      categoryDistribution: {}
    }
  }

  async dispose(): Promise<void> {
    await this.unitOfWork.dispose()
  }
}

// 依存性登録関数
export function registerServices(): void {
  logger.info('Registering services in DI container...')

  // 基盤サービス (Singleton)
  container.registerSingleton(
    SERVICE_TOKENS.EVENT_DISPATCHER,
    () => eventDispatcher
  )

  container.registerSingleton(
    SERVICE_TOKENS.COMMAND_BUS,
    () => globalCommandBus
  )

  container.registerSingleton(
    SERVICE_TOKENS.QUERY_BUS,
    () => globalQueryBus
  )

  container.registerSingleton(
    SERVICE_TOKENS.CQRS_MEDIATOR,
    (container) => new CQRSMediator(
      globalCommandBus,
      globalQueryBus
    )
  )

  // リポジトリ (Transient - 各リクエストで新しいインスタンス)
  container.registerTransient(
    SERVICE_TOKENS.UNIT_OF_WORK,
    () => createUnitOfWork()
  )

  container.registerTransient(
    SERVICE_TOKENS.TASK_REPOSITORY,
    () => createTaskRepository()
  )

  container.registerTransient(
    SERVICE_TOKENS.CATEGORY_REPOSITORY,
    () => createCategoryRepository()
  )

  container.registerTransient(
    SERVICE_TOKENS.GOOGLE_CALENDAR_REPOSITORY,
    () => createGoogleCalendarRepository()
  )

  // バリデーター (Singleton)
  container.registerSingleton(
    SERVICE_TOKENS.TASK_VALIDATOR,
    () => taskValidator
  )

  container.registerSingleton(
    SERVICE_TOKENS.CATEGORY_VALIDATOR,
    () => categoryValidator
  )

  container.registerSingleton(
    SERVICE_TOKENS.GOOGLE_CALENDAR_VALIDATOR,
    () => googleCalendarConfigValidator
  )

  // 外部サービス (Singleton)
  container.registerSingleton(
    SERVICE_TOKENS.GOOGLE_CALENDAR_CLIENT,
    () => {
      const credentials = getGoogleCredentialsFromEnv()
      return createGoogleCalendarClient(credentials)
    }
  )

  // アプリケーションサービス (Scoped - リクエストスコープ)
  container.registerScoped(
    SERVICE_TOKENS.TASK_SERVICE,
    async (container) => new TaskService(
      await container.get(SERVICE_TOKENS.UNIT_OF_WORK),
      await container.get(SERVICE_TOKENS.EVENT_DISPATCHER),
      await container.get(SERVICE_TOKENS.TASK_VALIDATOR)
    ),
    [SERVICE_TOKENS.UNIT_OF_WORK, SERVICE_TOKENS.EVENT_DISPATCHER, SERVICE_TOKENS.TASK_VALIDATOR]
  )

  container.registerScoped(
    SERVICE_TOKENS.CATEGORY_SERVICE,
    async (container) => new CategoryService(
      await container.get(SERVICE_TOKENS.UNIT_OF_WORK),
      await container.get(SERVICE_TOKENS.EVENT_DISPATCHER),
      await container.get(SERVICE_TOKENS.CATEGORY_VALIDATOR)
    ),
    [SERVICE_TOKENS.UNIT_OF_WORK, SERVICE_TOKENS.EVENT_DISPATCHER, SERVICE_TOKENS.CATEGORY_VALIDATOR]
  )

  container.registerScoped(
    SERVICE_TOKENS.GOOGLE_CALENDAR_SERVICE,
    async (container) => new GoogleCalendarService(
      await container.get(SERVICE_TOKENS.UNIT_OF_WORK),
      await container.get(SERVICE_TOKENS.EVENT_DISPATCHER),
      await container.get(SERVICE_TOKENS.GOOGLE_CALENDAR_VALIDATOR),
      await container.get(SERVICE_TOKENS.GOOGLE_CALENDAR_CLIENT)
    ),
    [
      SERVICE_TOKENS.UNIT_OF_WORK,
      SERVICE_TOKENS.EVENT_DISPATCHER,
      SERVICE_TOKENS.GOOGLE_CALENDAR_VALIDATOR,
      SERVICE_TOKENS.GOOGLE_CALENDAR_CLIENT
    ]
  )

  container.registerScoped(
    SERVICE_TOKENS.NOTIFICATION_SERVICE,
    async (container) => new NotificationService(
      await container.get(SERVICE_TOKENS.EVENT_DISPATCHER)
    ),
    [SERVICE_TOKENS.EVENT_DISPATCHER]
  )

  container.registerScoped(
    SERVICE_TOKENS.ANALYTICS_SERVICE,
    async (container) => new AnalyticsService(
      await container.get(SERVICE_TOKENS.UNIT_OF_WORK)
    ),
    [SERVICE_TOKENS.UNIT_OF_WORK]
  )

  logger.info('Services registered successfully')
}

// システム初期化
export async function initializeArchitecture(): Promise<() => Promise<void>> {
  logger.info('Initializing architecture...')

  try {
    // 1. サービス登録
    registerServices()

    // 2. イベントハンドラー設定
    const unsubscribeEventHandlers = setupEventHandlers()

    // 3. アーキテクチャヘルスチェック
    await performHealthCheck()

    logger.info('Architecture initialized successfully')

    // クリーンアップ関数を返す
    return async () => {
      logger.info('Shutting down architecture...')
      
      unsubscribeEventHandlers()
      await container.dispose()
      
      logger.info('Architecture shutdown completed')
    }

  } catch (error) {
    logger.error('Failed to initialize architecture', { error })
    throw error
  }
}

// ヘルスチェック
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy'
  details: Record<string, any>
}> {
  const details: Record<string, any> = {}

  try {
    // コンテナ診断
    details.container = container.getDiagnostics()

    // イベントディスパッチャー診断
    details.eventDispatcher = eventDispatcher.getDiagnostics()

    // バリデーションメトリクス
    details.validation = ValidationMetrics.getMetrics()

    // 基本的なサービス取得テスト
    const testScope = container.createScope()
    try {
      await testScope.get(SERVICE_TOKENS.TASK_SERVICE)
      details.serviceResolution = 'success'
    } catch (error) {
      details.serviceResolution = { error: (error as Error).message }
    } finally {
      await testScope.dispose()
    }

    const isHealthy = details.serviceResolution === 'success'

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details
    }

  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: (error as Error).message,
        stack: (error as Error).stack
      }
    }
  }
}

// 診断API用のヘルパー
export async function getArchitectureDiagnostics() {
  return {
    healthCheck: await performHealthCheck(),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  }
}

// スコープ付きサービス取得のヘルパー
export function createServiceScope() {
  return container.createScope()
}

// 便利なヘルパー関数
export async function withServiceScope<T>(
  operation: (scope: any) => Promise<T>
): Promise<T> {
  const scope = container.createScope()
  try {
    return await operation(scope)
  } finally {
    await scope.dispose()
  }
}