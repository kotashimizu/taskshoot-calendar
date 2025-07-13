/**
 * ドメインイベントシステム
 * イベント駆動アーキテクチャによる疎結合設計
 */

import { logger } from '@/lib/logger'
import { Task, TaskWithCategory } from '@/types/tasks'

// 基底ドメインイベント
export abstract class DomainEvent {
  public readonly id: string = crypto.randomUUID()
  public readonly occurredAt: Date = new Date()
  public readonly eventType: string

  constructor(eventType: string) {
    this.eventType = eventType
  }
}

// イベントハンドラーインターフェース
export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void> | void
}

// イベントディスパッチャーインターフェース
export interface EventDispatcher {
  dispatch<T extends DomainEvent>(event: T): Promise<void>
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): () => void
  unsubscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void
  clear(): void
}

// タスク関連イベント
export class TaskCreatedEvent extends DomainEvent {
  static readonly TYPE = 'task.created'

  constructor(
    public readonly task: TaskWithCategory,
    public readonly userId: string
  ) {
    super(TaskCreatedEvent.TYPE)
  }
}

export class TaskUpdatedEvent extends DomainEvent {
  static readonly TYPE = 'task.updated'

  constructor(
    public readonly task: TaskWithCategory,
    public readonly previousTask: TaskWithCategory,
    public readonly userId: string
  ) {
    super(TaskUpdatedEvent.TYPE)
  }
}

export class TaskDeletedEvent extends DomainEvent {
  static readonly TYPE = 'task.deleted'

  constructor(
    public readonly taskId: string,
    public readonly task: TaskWithCategory,
    public readonly userId: string
  ) {
    super(TaskDeletedEvent.TYPE)
  }
}

export class TaskCompletedEvent extends DomainEvent {
  static readonly TYPE = 'task.completed'

  constructor(
    public readonly task: TaskWithCategory,
    public readonly userId: string,
    public readonly completedAt: Date = new Date()
  ) {
    super(TaskCompletedEvent.TYPE)
  }
}

export class TaskOverdueEvent extends DomainEvent {
  static readonly TYPE = 'task.overdue'

  constructor(
    public readonly task: TaskWithCategory,
    public readonly userId: string,
    public readonly overdueDays: number
  ) {
    super(TaskOverdueEvent.TYPE)
  }
}

// Google Calendar関連イベント
export class GoogleCalendarConnectedEvent extends DomainEvent {
  static readonly TYPE = 'google_calendar.connected'

  constructor(
    public readonly userId: string,
    public readonly calendarCount: number
  ) {
    super(GoogleCalendarConnectedEvent.TYPE)
  }
}

export class GoogleCalendarDisconnectedEvent extends DomainEvent {
  static readonly TYPE = 'google_calendar.disconnected'

  constructor(public readonly userId: string) {
    super(GoogleCalendarDisconnectedEvent.TYPE)
  }
}

export class GoogleCalendarSyncStartedEvent extends DomainEvent {
  static readonly TYPE = 'google_calendar.sync_started'

  constructor(
    public readonly userId: string,
    public readonly syncDirection: string,
    public readonly calendarIds: string[]
  ) {
    super(GoogleCalendarSyncStartedEvent.TYPE)
  }
}

export class GoogleCalendarSyncCompletedEvent extends DomainEvent {
  static readonly TYPE = 'google_calendar.sync_completed'

  constructor(
    public readonly userId: string,
    public readonly eventsProcessed: number,
    public readonly syncDuration: number,
    public readonly success: boolean,
    public readonly errors?: string[]
  ) {
    super(GoogleCalendarSyncCompletedEvent.TYPE)
  }
}

// システム関連イベント
export class UserRegisteredEvent extends DomainEvent {
  static readonly TYPE = 'user.registered'

  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    super(UserRegisteredEvent.TYPE)
  }
}

export class UserLoginEvent extends DomainEvent {
  static readonly TYPE = 'user.login'

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly loginMethod: string
  ) {
    super(UserLoginEvent.TYPE)
  }
}

// エラーイベント
export class ErrorOccurredEvent extends DomainEvent {
  static readonly TYPE = 'system.error'

  constructor(
    public readonly error: Error,
    public readonly context: Record<string, any>,
    public readonly severity: 'low' | 'medium' | 'high' | 'critical'
  ) {
    super(ErrorOccurredEvent.TYPE)
  }
}

// イベントディスパッチャー実装
export class InMemoryEventDispatcher implements EventDispatcher {
  private handlers = new Map<string, Set<EventHandler<any>>>()
  private processing = new Set<string>()

  async dispatch<T extends DomainEvent>(event: T): Promise<void> {
    const eventKey = `${event.eventType}-${event.id}`
    
    // 重複処理防止
    if (this.processing.has(eventKey)) {
      logger.warn(`Event ${event.eventType} is already being processed`, { eventId: event.id })
      return
    }

    this.processing.add(eventKey)

    try {
      const handlers = this.handlers.get(event.eventType)
      if (!handlers || handlers.size === 0) {
        logger.debug(`No handlers registered for event: ${event.eventType}`)
        return
      }

      logger.debug(`Dispatching event: ${event.eventType}`, {
        eventId: event.id,
        handlerCount: handlers.size
      })

      // ハンドラーを並列実行（エラーを独立して処理）
      const promises = Array.from(handlers).map(async (handler) => {
        try {
          await handler.handle(event)
          logger.debug(`Handler completed for event: ${event.eventType}`, {
            eventId: event.id,
            handler: handler.constructor.name
          })
        } catch (error) {
          logger.error(`Handler failed for event: ${event.eventType}`, {
            eventId: event.id,
            handler: handler.constructor.name,
            error
          })
          
          // エラーハンドラーが失敗した場合のフォールバック
          if (event.eventType !== ErrorOccurredEvent.TYPE) {
            await this.dispatch(new ErrorOccurredEvent(
              error as Error,
              { originalEvent: event, handler: handler.constructor.name },
              'medium'
            ))
          }
        }
      })

      await Promise.all(promises)

    } finally {
      this.processing.delete(eventKey)
    }
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }

    this.handlers.get(eventType)!.add(handler)
    
    logger.debug(`Handler subscribed to event: ${eventType}`, {
      handler: handler.constructor.name,
      totalHandlers: this.handlers.get(eventType)!.size
    })

    // アンサブスクライブ関数を返す
    return () => this.unsubscribe(eventType, handler)
  }

  unsubscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
      
      if (handlers.size === 0) {
        this.handlers.delete(eventType)
      }
      
      logger.debug(`Handler unsubscribed from event: ${eventType}`, {
        handler: handler.constructor.name,
        remainingHandlers: handlers.size
      })
    }
  }

  clear(): void {
    const eventTypeCount = this.handlers.size
    const totalHandlers = Array.from(this.handlers.values())
      .reduce((sum, handlers) => sum + handlers.size, 0)
    
    this.handlers.clear()
    this.processing.clear()
    
    logger.info('Event dispatcher cleared', {
      eventTypeCount,
      totalHandlers
    })
  }

  // 診断情報
  getDiagnostics() {
    const eventTypes = Array.from(this.handlers.keys())
    const handlerCounts = Array.from(this.handlers.entries()).map(([eventType, handlers]) => ({
      eventType,
      handlerCount: handlers.size
    }))

    return {
      eventTypes,
      handlerCounts,
      processingCount: this.processing.size,
      totalHandlers: Array.from(this.handlers.values())
        .reduce((sum, handlers) => sum + handlers.size, 0)
    }
  }
}

// イベントハンドラーの基底クラス
export abstract class BaseEventHandler<T extends DomainEvent> implements EventHandler<T> {
  constructor(protected eventDispatcher: EventDispatcher) {}

  abstract handle(event: T): Promise<void> | void

  protected async dispatchEvent(event: DomainEvent): Promise<void> {
    await this.eventDispatcher.dispatch(event)
  }
}

// 具体的なイベントハンドラー例

// タスク完了時のGoogle Calendar同期ハンドラー
export class TaskCompletedGoogleCalendarSyncHandler extends BaseEventHandler<TaskCompletedEvent> {
  async handle(event: TaskCompletedEvent): Promise<void> {
    logger.info('Handling task completion for Google Calendar sync', {
      taskId: event.task.id,
      userId: event.userId
    })

    // TODO: Google Calendar同期ロジックを実装
    // この例では、タスクが完了したときにGoogle Calendarのイベントを更新
    
    try {
      // 実際の同期処理はここに実装
      // await googleCalendarSyncService.updateTaskCompletion(event.task)
      
      logger.info('Task completion synced to Google Calendar', {
        taskId: event.task.id
      })
    } catch (error) {
      logger.error('Failed to sync task completion to Google Calendar', {
        taskId: event.task.id,
        error
      })
      
      await this.dispatchEvent(new ErrorOccurredEvent(
        error as Error,
        { taskId: event.task.id, userId: event.userId },
        'medium'
      ))
    }
  }
}

// タスク作成時の通知ハンドラー
export class TaskCreatedNotificationHandler extends BaseEventHandler<TaskCreatedEvent> {
  async handle(event: TaskCreatedEvent): Promise<void> {
    logger.info('Handling task creation notification', {
      taskId: event.task.id,
      userId: event.userId
    })

    // TODO: 通知ロジックを実装
    // 例：メール通知、Slack通知、プッシュ通知など
  }
}

// ユーザー登録時の初期設定ハンドラー
export class UserRegisteredSetupHandler extends BaseEventHandler<UserRegisteredEvent> {
  async handle(event: UserRegisteredEvent): Promise<void> {
    logger.info('Setting up new user', {
      userId: event.userId,
      email: event.email
    })

    try {
      // TODO: 初期設定ロジックを実装
      // 例：デフォルトカテゴリの作成、ウェルカムタスクの作成など
      
      logger.info('User setup completed', {
        userId: event.userId
      })
    } catch (error) {
      logger.error('Failed to setup new user', {
        userId: event.userId,
        error
      })
      
      await this.dispatchEvent(new ErrorOccurredEvent(
        error as Error,
        { userId: event.userId, email: event.email },
        'high'
      ))
    }
  }
}

// システムエラー監視ハンドラー
export class ErrorMonitoringHandler extends BaseEventHandler<ErrorOccurredEvent> {
  async handle(event: ErrorOccurredEvent): Promise<void> {
    logger.error('System error occurred', {
      error: event.error.message,
      context: event.context,
      severity: event.severity,
      stack: event.error.stack
    })

    // 重大なエラーの場合は外部監視システムに通知
    if (event.severity === 'critical' || event.severity === 'high') {
      // TODO: Sentry、Datadog等への送信
      // await this.sendToMonitoringSystem(event)
    }
  }
}

// グローバルイベントディスパッチャー
export const eventDispatcher = new InMemoryEventDispatcher()

// イベントハンドラーの自動登録ヘルパー
export function setupEventHandlers(): () => void {
  const unsubscribeFunctions: Array<() => void> = []

  // タスク関連ハンドラー
  unsubscribeFunctions.push(
    eventDispatcher.subscribe(
      TaskCompletedEvent.TYPE,
      new TaskCompletedGoogleCalendarSyncHandler(eventDispatcher)
    )
  )

  unsubscribeFunctions.push(
    eventDispatcher.subscribe(
      TaskCreatedEvent.TYPE,
      new TaskCreatedNotificationHandler(eventDispatcher)
    )
  )

  // ユーザー関連ハンドラー
  unsubscribeFunctions.push(
    eventDispatcher.subscribe(
      UserRegisteredEvent.TYPE,
      new UserRegisteredSetupHandler(eventDispatcher)
    )
  )

  // システム関連ハンドラー
  unsubscribeFunctions.push(
    eventDispatcher.subscribe(
      ErrorOccurredEvent.TYPE,
      new ErrorMonitoringHandler(eventDispatcher)
    )
  )

  logger.info('Event handlers registered', {
    handlerCount: unsubscribeFunctions.length
  })

  // 全ハンドラーのアンサブスクライブ関数を返す
  return () => {
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
    logger.info('All event handlers unsubscribed')
  }
}

// イベント発行ヘルパー関数
export async function publishTaskCreated(task: TaskWithCategory, userId: string): Promise<void> {
  await eventDispatcher.dispatch(new TaskCreatedEvent(task, userId))
}

export async function publishTaskUpdated(
  task: TaskWithCategory, 
  previousTask: TaskWithCategory, 
  userId: string
): Promise<void> {
  await eventDispatcher.dispatch(new TaskUpdatedEvent(task, previousTask, userId))
  
  // タスクが完了状態に変更された場合は完了イベントも発行
  if (task.status === 'completed' && previousTask.status !== 'completed') {
    await eventDispatcher.dispatch(new TaskCompletedEvent(task, userId))
  }
}

export async function publishTaskDeleted(
  taskId: string, 
  task: TaskWithCategory, 
  userId: string
): Promise<void> {
  await eventDispatcher.dispatch(new TaskDeletedEvent(taskId, task, userId))
}

export async function publishGoogleCalendarConnected(
  userId: string, 
  calendarCount: number
): Promise<void> {
  await eventDispatcher.dispatch(new GoogleCalendarConnectedEvent(userId, calendarCount))
}

export async function publishGoogleCalendarSyncCompleted(
  userId: string,
  eventsProcessed: number,
  syncDuration: number,
  success: boolean,
  errors?: string[]
): Promise<void> {
  await eventDispatcher.dispatch(new GoogleCalendarSyncCompletedEvent(
    userId,
    eventsProcessed,
    syncDuration,
    success,
    errors
  ))
}

export async function publishError(
  error: Error,
  context: Record<string, any>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<void> {
  await eventDispatcher.dispatch(new ErrorOccurredEvent(error, context, severity))
}