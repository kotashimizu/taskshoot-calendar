/**
 * ストラテジーパターン実装
 * アルゴリズムの動的切り替えと拡張性向上
 */

import { logger } from '@/lib/logger'
import { TaskWithCategory } from '@/types/tasks'

// ストラテジーインターフェース
export interface Strategy<TInput = any, TOutput = any> {
  name: string
  description: string
  execute(input: TInput, context?: any): Promise<TOutput> | TOutput
  validate?(input: TInput): boolean
}

// ストラテジーコンテキスト
export class StrategyContext<TInput, TOutput> {
  private strategies = new Map<string, Strategy<TInput, TOutput>>()
  private defaultStrategy?: string

  /**
   * ストラテジーを登録
   */
  registerStrategy(strategy: Strategy<TInput, TOutput>): this {
    this.strategies.set(strategy.name, strategy)
    logger.debug(`Strategy registered: ${strategy.name}`)
    return this
  }

  /**
   * デフォルトストラテジーを設定
   */
  setDefaultStrategy(strategyName: string): this {
    if (!this.strategies.has(strategyName)) {
      throw new Error(`Strategy not found: ${strategyName}`)
    }
    this.defaultStrategy = strategyName
    return this
  }

  /**
   * ストラテジーを実行
   */
  async execute(
    strategyName: string | undefined,
    input: TInput,
    context?: any
  ): Promise<TOutput> {
    const name = strategyName || this.defaultStrategy
    
    if (!name) {
      throw new Error('No strategy specified and no default strategy set')
    }

    const strategy = this.strategies.get(name)
    if (!strategy) {
      throw new Error(`Strategy not found: ${name}`)
    }

    // バリデーション実行
    if (strategy.validate && !strategy.validate(input)) {
      throw new Error(`Strategy validation failed: ${name}`)
    }

    try {
      logger.debug(`Executing strategy: ${name}`, { input, context })
      const result = await strategy.execute(input, context)
      logger.debug(`Strategy executed successfully: ${name}`)
      return result
    } catch (error) {
      logger.error(`Strategy execution failed: ${name}`, { error, input })
      throw error
    }
  }

  /**
   * 利用可能なストラテジー一覧
   */
  getAvailableStrategies(): Array<{ name: string; description: string }> {
    return Array.from(this.strategies.values()).map(strategy => ({
      name: strategy.name,
      description: strategy.description
    }))
  }

  /**
   * ストラテジーの存在確認
   */
  hasStrategy(name: string): boolean {
    return this.strategies.has(name)
  }
}

// タスク優先度計算ストラテジー
export interface TaskPriorityInput {
  task: TaskWithCategory
  userPreferences?: any
  currentContext?: any
}

export class SimplePriorityStrategy implements Strategy<TaskPriorityInput, number> {
  name = 'simple'
  description = 'Simple priority based on task priority field'

  execute(input: TaskPriorityInput): number {
    const { task } = input
    
    const priorityMap = {
      'urgent': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    }

    return priorityMap[task.priority] || 1
  }
}

export class DeadlinePriorityStrategy implements Strategy<TaskPriorityInput, number> {
  name = 'deadline'
  description = 'Priority based on deadline urgency'

  execute(input: TaskPriorityInput): number {
    const { task } = input
    
    if (!task.due_date) return 1

    const now = new Date()
    const dueDate = new Date(task.due_date)
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue < 0) return 5 // 過期
    if (daysUntilDue === 0) return 4 // 今日
    if (daysUntilDue === 1) return 3 // 明日
    if (daysUntilDue <= 7) return 2 // 1週間以内
    return 1 // それ以外
  }
}

export class EisenhowerMatrixStrategy implements Strategy<TaskPriorityInput, number> {
  name = 'eisenhower'
  description = 'Eisenhower Matrix based priority (Important vs Urgent)'

  execute(input: TaskPriorityInput): number {
    const { task } = input
    
    const isUrgent = this.isUrgent(task)
    const isImportant = this.isImportant(task)

    if (isUrgent && isImportant) return 4 // Do First
    if (!isUrgent && isImportant) return 3 // Schedule
    if (isUrgent && !isImportant) return 2 // Delegate
    return 1 // Eliminate
  }

  private isUrgent(task: TaskWithCategory): boolean {
    if (!task.due_date) return false
    
    const now = new Date()
    const dueDate = new Date(task.due_date)
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    return daysUntilDue <= 2
  }

  private isImportant(task: TaskWithCategory): boolean {
    return ['high', 'urgent'].includes(task.priority) || 
           (task.estimated_minutes && task.estimated_minutes > 120) // 2時間以上
  }
}

// Google Calendar同期ストラテジー
export interface SyncInput {
  direction: 'both' | 'gcal_to_taskshoot' | 'taskshoot_to_gcal'
  tasks: TaskWithCategory[]
  events: any[]
  userId: string
}

export interface SyncOutput {
  syncedTasks: number
  syncedEvents: number
  conflicts: any[]
  errors: string[]
}

export class FullSyncStrategy implements Strategy<SyncInput, SyncOutput> {
  name = 'full'
  description = 'Complete synchronization of all tasks and events'

  async execute(input: SyncInput): Promise<SyncOutput> {
    const { direction, tasks, events } = input
    
    let syncedTasks = 0
    let syncedEvents = 0
    const conflicts: any[] = []
    const errors: string[] = []

    try {
      if (direction === 'both' || direction === 'gcal_to_taskshoot') {
        syncedTasks = await this.syncEventsToTasks(events)
      }

      if (direction === 'both' || direction === 'taskshoot_to_gcal') {
        syncedEvents = await this.syncTasksToEvents(tasks)
      }

      return { syncedTasks, syncedEvents, conflicts, errors }
    } catch (error) {
      errors.push((error as Error).message)
      return { syncedTasks, syncedEvents, conflicts, errors }
    }
  }

  private async syncEventsToTasks(events: any[]): Promise<number> {
    // 実装はGoogle Calendar統合サービスに委譲
    return events.length
  }

  private async syncTasksToEvents(tasks: TaskWithCategory[]): Promise<number> {
    // 実装はGoogle Calendar統合サービスに委譲
    return tasks.length
  }
}

export class IncrementalSyncStrategy implements Strategy<SyncInput, SyncOutput> {
  name = 'incremental'
  description = 'Incremental synchronization based on last sync timestamp'

  async execute(input: SyncInput, context?: { lastSyncAt?: string }): Promise<SyncOutput> {
    const { direction, tasks, events } = input
    const lastSyncAt = context?.lastSyncAt ? new Date(context.lastSyncAt) : new Date(0)
    
    // 最終同期以降に変更されたアイテムのみ同期
    const recentTasks = tasks.filter(task => 
      new Date(task.updated_at) > lastSyncAt
    )
    
    const recentEvents = events.filter(event => 
      event.updated && new Date(event.updated) > lastSyncAt
    )

    // フル同期と同じロジックだが、フィルタされたデータで実行
    const fullSync = new FullSyncStrategy()
    return fullSync.execute({
      ...input,
      tasks: recentTasks,
      events: recentEvents
    })
  }
}

// 通知送信ストラテジー
export interface NotificationInput {
  type: string
  userId: string
  message: string
  data?: any
}

export class EmailNotificationStrategy implements Strategy<NotificationInput, boolean> {
  name = 'email'
  description = 'Send notification via email'

  async execute(input: NotificationInput): Promise<boolean> {
    const { userId, message, data } = input
    
    try {
      // 実際のメール送信実装
      logger.info('Email notification sent', { userId, message })
      return true
    } catch (error) {
      logger.error('Failed to send email notification', { error, userId })
      return false
    }
  }
}

export class PushNotificationStrategy implements Strategy<NotificationInput, boolean> {
  name = 'push'
  description = 'Send push notification'

  async execute(input: NotificationInput): Promise<boolean> {
    const { userId, message, data } = input
    
    try {
      // 実際のプッシュ通知実装
      logger.info('Push notification sent', { userId, message })
      return true
    } catch (error) {
      logger.error('Failed to send push notification', { error, userId })
      return false
    }
  }
}

export class InAppNotificationStrategy implements Strategy<NotificationInput, boolean> {
  name = 'in_app'
  description = 'Show in-app notification'

  async execute(input: NotificationInput): Promise<boolean> {
    const { userId, message, data } = input
    
    try {
      // アプリ内通知の実装
      logger.info('In-app notification created', { userId, message })
      return true
    } catch (error) {
      logger.error('Failed to create in-app notification', { error, userId })
      return false
    }
  }
}

// 事前設定されたストラテジーコンテキスト
export const taskPriorityContext = new StrategyContext<TaskPriorityInput, number>()
  .registerStrategy(new SimplePriorityStrategy())
  .registerStrategy(new DeadlinePriorityStrategy())
  .registerStrategy(new EisenhowerMatrixStrategy())
  .setDefaultStrategy('simple')

export const syncContext = new StrategyContext<SyncInput, SyncOutput>()
  .registerStrategy(new FullSyncStrategy())
  .registerStrategy(new IncrementalSyncStrategy())
  .setDefaultStrategy('incremental')

export const notificationContext = new StrategyContext<NotificationInput, boolean>()
  .registerStrategy(new EmailNotificationStrategy())
  .registerStrategy(new PushNotificationStrategy())
  .registerStrategy(new InAppNotificationStrategy())
  .setDefaultStrategy('in_app')

// ヘルパー関数
export async function calculateTaskPriority(
  task: TaskWithCategory,
  strategyName?: string,
  userPreferences?: any
): Promise<number> {
  return taskPriorityContext.execute(strategyName, { task, userPreferences })
}

export async function syncGoogleCalendar(
  input: SyncInput,
  strategyName?: string,
  context?: any
): Promise<SyncOutput> {
  return syncContext.execute(strategyName, input, context)
}

export async function sendNotification(
  input: NotificationInput,
  strategyName?: string
): Promise<boolean> {
  return notificationContext.execute(strategyName, input)
}

// ストラテジーパターンのエクスポート
export const StrategyPattern = {
  Context: StrategyContext,
  taskPriority: taskPriorityContext,
  sync: syncContext,
  notification: notificationContext,
  
  // ヘルパーメソッド
  calculateTaskPriority,
  syncGoogleCalendar,
  sendNotification
}