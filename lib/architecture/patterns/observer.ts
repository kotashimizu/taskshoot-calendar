/**
 * オブザーバーパターン実装
 * リアルタイム更新とイベント監視
 */

import { logger } from '@/lib/logger'

// オブザーバーインターフェース
export interface Observer<T = any> {
  id: string
  update(data: T, context?: any): Promise<void> | void
  shouldNotify?(data: T, context?: any): boolean
}

// サブジェクトインターフェース
export interface Subject<T = any> {
  subscribe(observer: Observer<T>): () => void
  unsubscribe(observerId: string): void
  notify(data: T, context?: any): Promise<void>
  getObserverCount(): number
}

// サブジェクト基底実装
export class BaseSubject<T> implements Subject<T> {
  private observers = new Map<string, Observer<T>>()
  private notificationInProgress = false

  subscribe(observer: Observer<T>): () => void {
    if (this.observers.has(observer.id)) {
      logger.warn(`Observer ${observer.id} is already subscribed`)
      return () => this.unsubscribe(observer.id)
    }

    this.observers.set(observer.id, observer)
    logger.debug(`Observer subscribed: ${observer.id}`)

    // アンサブスクライブ関数を返す
    return () => this.unsubscribe(observer.id)
  }

  unsubscribe(observerId: string): void {
    if (this.observers.delete(observerId)) {
      logger.debug(`Observer unsubscribed: ${observerId}`)
    }
  }

  async notify(data: T, context?: any): Promise<void> {
    if (this.notificationInProgress) {
      logger.warn('Notification already in progress, skipping')
      return
    }

    if (this.observers.size === 0) {
      logger.debug('No observers to notify')
      return
    }

    this.notificationInProgress = true

    try {
      const notifications = Array.from(this.observers.values()).map(async (observer) => {
        try {
          // 条件付き通知
          if (observer.shouldNotify && !observer.shouldNotify(data, context)) {
            return
          }

          await observer.update(data, context)
          logger.debug(`Observer notified: ${observer.id}`)
        } catch (error) {
          logger.error(`Observer notification failed: ${observer.id}`, { error })
        }
      })

      await Promise.all(notifications)
    } finally {
      this.notificationInProgress = false
    }
  }

  getObserverCount(): number {
    return this.observers.size
  }

  // すべてのオブザーバーを削除
  clear(): void {
    const count = this.observers.size
    this.observers.clear()
    logger.debug(`Cleared ${count} observers`)
  }
}

// タスク変更監視
export interface TaskChangeData {
  taskId: string
  userId: string
  changeType: 'created' | 'updated' | 'deleted' | 'completed'
  task?: any
  previousTask?: any
  timestamp: Date
}

export class TaskChangeObserver implements Observer<TaskChangeData> {
  constructor(
    public readonly id: string,
    private callback: (data: TaskChangeData) => Promise<void> | void,
    private filter?: (data: TaskChangeData) => boolean
  ) {}

  shouldNotify(data: TaskChangeData): boolean {
    return this.filter ? this.filter(data) : true
  }

  async update(data: TaskChangeData): Promise<void> {
    await this.callback(data)
  }
}

// UI更新オブザーバー
export class UIUpdateObserver implements Observer<TaskChangeData> {
  constructor(
    public readonly id: string,
    private updateHandler: (data: TaskChangeData) => void
  ) {}

  update(data: TaskChangeData): void {
    logger.debug('Updating UI for task change', { 
      taskId: data.taskId,
      changeType: data.changeType 
    })
    
    this.updateHandler(data)
  }
}

// 統計更新オブザーバー
export class StatsUpdateObserver implements Observer<TaskChangeData> {
  public readonly id = 'stats-updater'

  async update(data: TaskChangeData): Promise<void> {
    if (['created', 'completed', 'deleted'].includes(data.changeType)) {
      logger.debug('Updating task statistics', { 
        userId: data.userId,
        changeType: data.changeType 
      })
      
      // 統計更新ロジック
      // await updateTaskStats(data.userId)
    }
  }
}

// 通知送信オブザーバー
export class NotificationObserver implements Observer<TaskChangeData> {
  public readonly id = 'notification-sender'

  shouldNotify(data: TaskChangeData): boolean {
    // 完了したタスクのみ通知
    return data.changeType === 'completed'
  }

  async update(data: TaskChangeData): Promise<void> {
    logger.debug('Sending task completion notification', { 
      taskId: data.taskId,
      userId: data.userId 
    })
    
    // 通知送信ロジック
    // await sendNotification(data.userId, 'task_completed', data.task)
  }
}

// Google Calendar同期オブザーバー
export class GoogleCalendarSyncObserver implements Observer<TaskChangeData> {
  public readonly id = 'google-calendar-sync'

  shouldNotify(data: TaskChangeData): boolean {
    // 作成、更新、削除のみ同期対象
    return ['created', 'updated', 'deleted'].includes(data.changeType)
  }

  async update(data: TaskChangeData): Promise<void> {
    logger.debug('Syncing task change to Google Calendar', { 
      taskId: data.taskId,
      changeType: data.changeType 
    })
    
    try {
      // Google Calendar同期ロジック
      // await syncTaskToGoogleCalendar(data)
    } catch (error) {
      logger.error('Failed to sync task to Google Calendar', { 
        taskId: data.taskId,
        error 
      })
    }
  }
}

// リアルタイム更新システム
export interface RealtimeUpdateData {
  type: 'task_change' | 'user_online' | 'system_status'
  userId?: string
  data: any
  timestamp: Date
}

export class RealtimeUpdateSubject extends BaseSubject<RealtimeUpdateData> {
  private connectionMap = new Map<string, Set<string>>() // userId -> observerIds

  subscribeForUser(userId: string, observer: Observer<RealtimeUpdateData>): () => void {
    const unsubscribe = this.subscribe(observer)
    
    if (!this.connectionMap.has(userId)) {
      this.connectionMap.set(userId, new Set())
    }
    this.connectionMap.get(userId)!.add(observer.id)

    return () => {
      unsubscribe()
      const userObservers = this.connectionMap.get(userId)
      if (userObservers) {
        userObservers.delete(observer.id)
        if (userObservers.size === 0) {
          this.connectionMap.delete(userId)
        }
      }
    }
  }

  async notifyUser(userId: string, data: RealtimeUpdateData): Promise<void> {
    const userObservers = this.connectionMap.get(userId)
    if (!userObservers || userObservers.size === 0) {
      return
    }

    // ユーザー固有の通知
    const notifications = Array.from(userObservers).map(async (observerId) => {
      const observer = this.observers.get(observerId)
      if (observer) {
        try {
          await observer.update(data)
        } catch (error) {
          logger.error(`Failed to notify user observer: ${observerId}`, { error })
        }
      }
    })

    await Promise.all(notifications)
  }

  getUserObserverCount(userId: string): number {
    return this.connectionMap.get(userId)?.size || 0
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectionMap.keys())
  }

  private observers = new Map<string, Observer<RealtimeUpdateData>>()
}

// WebSocket接続オブザーバー
export class WebSocketObserver implements Observer<RealtimeUpdateData> {
  constructor(
    public readonly id: string,
    private websocket: any, // WebSocket connection
    private userId: string
  ) {}

  shouldNotify(data: RealtimeUpdateData): boolean {
    // 自分のユーザーIDに関連するデータのみ通知
    return !data.userId || data.userId === this.userId
  }

  update(data: RealtimeUpdateData): void {
    if (this.websocket.readyState === 1) { // WebSocket.OPEN
      try {
        this.websocket.send(JSON.stringify({
          type: 'realtime_update',
          data: data
        }))
      } catch (error) {
        logger.error('Failed to send WebSocket message', { 
          observerId: this.id,
          error 
        })
      }
    }
  }
}

// パフォーマンス監視オブザーバー
export class PerformanceObserver implements Observer<any> {
  public readonly id = 'performance-monitor'
  private metrics = {
    eventCount: 0,
    lastEventTime: Date.now(),
    averageProcessingTime: 0
  }

  async update(data: any, context?: any): Promise<void> {
    const startTime = Date.now()
    
    // パフォーマンスメトリクス更新
    this.metrics.eventCount++
    this.metrics.lastEventTime = startTime
    
    // 処理時間を記録（実際の処理はここには書かない）
    const processingTime = Date.now() - startTime
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime + processingTime) / 2

    if (processingTime > 100) { // 100ms以上の場合は警告
      logger.warn('Slow observer processing detected', {
        processingTime,
        eventCount: this.metrics.eventCount
      })
    }
  }

  getMetrics() {
    return { ...this.metrics }
  }

  reset(): void {
    this.metrics = {
      eventCount: 0,
      lastEventTime: Date.now(),
      averageProcessingTime: 0
    }
  }
}

// 事前設定されたサブジェクトインスタンス
export const taskChangeSubject = new BaseSubject<TaskChangeData>()
export const realtimeUpdateSubject = new RealtimeUpdateSubject()

// デフォルトオブザーバーの登録
export function setupDefaultObservers(): () => void {
  const unsubscribeFunctions: Array<() => void> = []

  // タスク変更監視
  unsubscribeFunctions.push(
    taskChangeSubject.subscribe(new StatsUpdateObserver())
  )
  
  unsubscribeFunctions.push(
    taskChangeSubject.subscribe(new NotificationObserver())
  )
  
  unsubscribeFunctions.push(
    taskChangeSubject.subscribe(new GoogleCalendarSyncObserver())
  )

  // パフォーマンス監視
  unsubscribeFunctions.push(
    taskChangeSubject.subscribe(new PerformanceObserver())
  )

  logger.info('Default observers registered', {
    taskChangeObservers: taskChangeSubject.getObserverCount()
  })

  // 全オブザーバーのアンサブスクライブ関数を返す
  return () => {
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
    logger.info('All default observers unsubscribed')
  }
}

// ヘルパー関数
export async function notifyTaskChange(data: TaskChangeData): Promise<void> {
  await taskChangeSubject.notify(data)
}

export async function notifyRealtimeUpdate(data: RealtimeUpdateData): Promise<void> {
  await realtimeUpdateSubject.notify(data)
}

export async function notifyUserUpdate(userId: string, data: RealtimeUpdateData): Promise<void> {
  await realtimeUpdateSubject.notifyUser(userId, data)
}

// オブザーバーパターンのエクスポート
export const ObserverPattern = {
  Subject: BaseSubject,
  RealtimeSubject: RealtimeUpdateSubject,
  taskChange: taskChangeSubject,
  realtimeUpdate: realtimeUpdateSubject,
  
  // オブザーバークラス
  TaskChangeObserver,
  UIUpdateObserver,
  StatsUpdateObserver,
  NotificationObserver,
  GoogleCalendarSyncObserver,
  WebSocketObserver,
  PerformanceObserver,
  
  // ヘルパーメソッド
  setupDefaultObservers,
  notifyTaskChange,
  notifyRealtimeUpdate,
  notifyUserUpdate
}