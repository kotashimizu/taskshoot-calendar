/**
 * ファクトリーパターン実装
 * 複雑なオブジェクト作成の抽象化と柔軟性の向上
 */

import { 
  TaskWithCategory, 
  Task, 
  TaskInsert, 
  Category, 
  CategoryInsert 
} from '@/types/tasks'
import { GoogleCalendarConfig } from '@/types/google-calendar'
import { logger } from '@/lib/logger'

// 抽象ファクトリーインターフェース
export interface Factory<T> {
  create(...args: any[]): T | Promise<T>
  createBatch(items: any[]): T[] | Promise<T[]>
  validate?(item: any): boolean
}

// ファクトリー設定インターフェース
export interface FactoryConfiguration {
  enableValidation: boolean
  enableLogging: boolean
  enableMetrics: boolean
  defaultValues?: Record<string, any>
}

// 基底ファクトリークラス
export abstract class BaseFactory<T> implements Factory<T> {
  protected config: FactoryConfiguration

  constructor(config: Partial<FactoryConfiguration> = {}) {
    this.config = {
      enableValidation: true,
      enableLogging: false,
      enableMetrics: false,
      ...config
    }
  }

  abstract create(...args: any[]): T | Promise<T>

  async createBatch(items: any[]): Promise<T[]> {
    const results: T[] = []
    
    for (const item of items) {
      try {
        const created = await this.create(item)
        results.push(created)
      } catch (error) {
        if (this.config.enableLogging) {
          logger.error('Failed to create item in batch', { item, error })
        }
        throw error
      }
    }

    return results
  }

  protected log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      logger.debug(`[${this.constructor.name}] ${message}`, data)
    }
  }

  protected applyDefaults(data: any): any {
    if (!this.config.defaultValues) return data
    
    return {
      ...this.config.defaultValues,
      ...data
    }
  }
}

// タスクファクトリー
export class TaskFactory extends BaseFactory<TaskWithCategory> {
  constructor(config?: Partial<FactoryConfiguration>) {
    super({
      enableValidation: true,
      enableLogging: true,
      defaultValues: {
        status: 'pending',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      ...config
    })
  }

  create(data: Partial<TaskInsert> & { user_id: string }): TaskWithCategory {
    this.log('Creating task', { title: data.title })

    if (this.config.enableValidation) {
      this.validateTaskData(data)
    }

    const taskData = this.applyDefaults(data)
    
    // ID生成
    const id = crypto.randomUUID()
    
    const task: TaskWithCategory = {
      id,
      user_id: taskData.user_id,
      title: taskData.title,
      description: taskData.description || null,
      status: taskData.status || 'pending',
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date || null,
      category_id: taskData.category_id || null,
      estimated_minutes: taskData.estimated_minutes || null,
      actual_minutes: taskData.actual_minutes || null,
      completed_at: taskData.completed_at || null,
      tags: taskData.tags || null,
      notes: taskData.notes || null,
      created_at: taskData.created_at,
      updated_at: taskData.updated_at,
      category: null // リレーションは後で設定
    }

    this.log('Task created successfully', { taskId: id })
    return task
  }

  createFromGoogleCalendarEvent(event: any, userId: string, categoryId?: string): TaskWithCategory {
    this.log('Creating task from Google Calendar event', { eventId: event.id })

    const estimatedMinutes = this.calculateDurationFromEvent(event)
    
    return this.create({
      user_id: userId,
      title: event.summary || 'Untitled Event',
      description: event.description || null,
      due_date: event.start?.dateTime || event.start?.date || null,
      category_id: categoryId || null,
      estimated_minutes: estimatedMinutes,
      tags: ['google-calendar']
    })
  }

  createSubtask(parentTask: TaskWithCategory, subtaskData: Partial<TaskInsert>): TaskWithCategory {
    this.log('Creating subtask', { parentTaskId: parentTask.id })

    return this.create({
      user_id: parentTask.user_id,
      title: subtaskData.title || `Subtask of ${parentTask.title}`,
      description: subtaskData.description,
      priority: subtaskData.priority || parentTask.priority,
      category_id: subtaskData.category_id || parentTask.category_id,
      due_date: subtaskData.due_date || parentTask.due_date,
      tags: [...(parentTask.tags || []), 'subtask']
    })
  }

  createRecurringTasks(
    baseTask: Partial<TaskInsert> & { user_id: string }, 
    recurrence: {
      frequency: 'daily' | 'weekly' | 'monthly'
      count: number
      interval?: number
    }
  ): TaskWithCategory[] {
    this.log('Creating recurring tasks', { frequency: recurrence.frequency, count: recurrence.count })

    const tasks: TaskWithCategory[] = []
    const baseDate = baseTask.due_date ? new Date(baseTask.due_date) : new Date()
    const interval = recurrence.interval || 1

    for (let i = 0; i < recurrence.count; i++) {
      const taskDate = new Date(baseDate)
      
      switch (recurrence.frequency) {
        case 'daily':
          taskDate.setDate(baseDate.getDate() + (i * interval))
          break
        case 'weekly':
          taskDate.setDate(baseDate.getDate() + (i * 7 * interval))
          break
        case 'monthly':
          taskDate.setMonth(baseDate.getMonth() + (i * interval))
          break
      }

      const recurringTask = this.create({
        ...baseTask,
        title: `${baseTask.title} (${i + 1}/${recurrence.count})`,
        due_date: taskDate.toISOString(),
        tags: [...(baseTask.tags || []), 'recurring']
      })

      tasks.push(recurringTask)
    }

    return tasks
  }

  private validateTaskData(data: any): void {
    if (!data.user_id) {
      throw new Error('user_id is required')
    }
    
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('title is required')
    }

    if (data.title.length > 200) {
      throw new Error('title must be 200 characters or less')
    }

    if (data.estimated_minutes && data.estimated_minutes < 0) {
      throw new Error('estimated_minutes must be positive')
    }
  }

  private calculateDurationFromEvent(event: any): number | null {
    if (!event.start?.dateTime || !event.end?.dateTime) {
      return null
    }

    const start = new Date(event.start.dateTime)
    const end = new Date(event.end.dateTime)
    const durationMs = end.getTime() - start.getTime()
    
    return Math.round(durationMs / (1000 * 60)) // 分単位
  }
}

// カテゴリファクトリー
export class CategoryFactory extends BaseFactory<Category> {
  constructor(config?: Partial<FactoryConfiguration>) {
    super({
      enableValidation: true,
      enableLogging: true,
      defaultValues: {
        color: '#6B7280',
        icon: 'folder',
        sort_order: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      ...config
    })
  }

  create(data: Partial<CategoryInsert> & { user_id: string }): Category {
    this.log('Creating category', { name: data.name })

    if (this.config.enableValidation) {
      this.validateCategoryData(data)
    }

    const categoryData = this.applyDefaults(data)
    const id = crypto.randomUUID()

    const category: Category = {
      id,
      user_id: categoryData.user_id,
      name: categoryData.name,
      description: categoryData.description || null,
      color: categoryData.color,
      icon: categoryData.icon,
      sort_order: categoryData.sort_order,
      is_active: categoryData.is_active,
      created_at: categoryData.created_at,
      updated_at: categoryData.updated_at
    }

    this.log('Category created successfully', { categoryId: id })
    return category
  }

  createDefaultCategories(userId: string): Category[] {
    this.log('Creating default categories', { userId })

    const defaultCategories = [
      { name: 'Work', color: '#3B82F6', icon: 'briefcase', sort_order: 1 },
      { name: 'Personal', color: '#10B981', icon: 'user', sort_order: 2 },
      { name: 'Health', color: '#F59E0B', icon: 'heart', sort_order: 3 },
      { name: 'Learning', color: '#8B5CF6', icon: 'book', sort_order: 4 },
      { name: 'Shopping', color: '#EF4444', icon: 'shopping-cart', sort_order: 5 }
    ]

    return defaultCategories.map(cat => this.create({
      user_id: userId,
      ...cat
    }))
  }

  createFromTemplate(
    template: 'gtd' | 'personal' | 'business' | 'student',
    userId: string
  ): Category[] {
    this.log('Creating categories from template', { template, userId })

    const templates = {
      gtd: [
        { name: 'Inbox', color: '#6B7280', icon: 'inbox' },
        { name: 'Next Actions', color: '#3B82F6', icon: 'play' },
        { name: 'Waiting For', color: '#F59E0B', icon: 'clock' },
        { name: 'Projects', color: '#10B981', icon: 'folder' },
        { name: 'Someday/Maybe', color: '#8B5CF6', icon: 'lightbulb' }
      ],
      personal: [
        { name: 'Family', color: '#EC4899', icon: 'users' },
        { name: 'Health', color: '#10B981', icon: 'heart' },
        { name: 'Hobbies', color: '#F59E0B', icon: 'star' },
        { name: 'Travel', color: '#06B6D4', icon: 'map' }
      ],
      business: [
        { name: 'Meetings', color: '#3B82F6', icon: 'calendar' },
        { name: 'Admin', color: '#6B7280', icon: 'clipboard' },
        { name: 'Projects', color: '#10B981', icon: 'briefcase' },
        { name: 'Follow-up', color: '#F59E0B', icon: 'phone' }
      ],
      student: [
        { name: 'Assignments', color: '#3B82F6', icon: 'book' },
        { name: 'Exams', color: '#EF4444', icon: 'clipboard-check' },
        { name: 'Research', color: '#8B5CF6', icon: 'search' },
        { name: 'Extracurricular', color: '#10B981', icon: 'users' }
      ]
    }

    const selectedTemplate = templates[template]
    return selectedTemplate.map((cat, index) => this.create({
      user_id: userId,
      sort_order: index + 1,
      ...cat
    }))
  }

  private validateCategoryData(data: any): void {
    if (!data.user_id) {
      throw new Error('user_id is required')
    }
    
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('name is required')
    }

    if (data.name.length > 100) {
      throw new Error('name must be 100 characters or less')
    }

    if (data.color && !/^#[0-9A-F]{6}$/i.test(data.color)) {
      throw new Error('color must be a valid hex color')
    }
  }
}

// Google Calendar設定ファクトリー
export class GoogleCalendarConfigFactory extends BaseFactory<GoogleCalendarConfig> {
  constructor(config?: Partial<FactoryConfiguration>) {
    super({
      enableValidation: true,
      enableLogging: true,
      defaultValues: {
        enabled: true,
        sync_direction: 'both',
        sync_frequency: '15min',
        auto_sync_enabled: true,
        sync_status: 'idle',
        selected_calendars: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      ...config
    })
  }

  create(data: Partial<GoogleCalendarConfig> & { user_id: string }): GoogleCalendarConfig {
    this.log('Creating Google Calendar config', { userId: data.user_id })

    if (this.config.enableValidation) {
      this.validateConfigData(data)
    }

    const configData = this.applyDefaults(data)
    const id = crypto.randomUUID()

    const config: GoogleCalendarConfig = {
      id,
      user_id: configData.user_id,
      enabled: configData.enabled,
      access_token: configData.access_token || null,
      refresh_token: configData.refresh_token || null,
      sync_direction: configData.sync_direction,
      sync_frequency: configData.sync_frequency,
      auto_sync_enabled: configData.auto_sync_enabled,
      selected_calendars: configData.selected_calendars,
      last_sync_at: configData.last_sync_at || null,
      sync_status: configData.sync_status,
      sync_error_message: configData.sync_error_message || null,
      created_at: configData.created_at,
      updated_at: configData.updated_at
    }

    this.log('Google Calendar config created successfully', { configId: id })
    return config
  }

  createFromAuthTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
    selectedCalendars: string[] = []
  ): GoogleCalendarConfig {
    return this.create({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      selected_calendars: selectedCalendars,
      last_sync_at: new Date().toISOString()
    })
  }

  private validateConfigData(data: any): void {
    if (!data.user_id) {
      throw new Error('user_id is required')
    }

    const validSyncDirections = ['both', 'gcal_to_taskshoot', 'taskshoot_to_gcal']
    if (data.sync_direction && !validSyncDirections.includes(data.sync_direction)) {
      throw new Error('sync_direction must be one of: ' + validSyncDirections.join(', '))
    }

    const validFrequencies = ['manual', '5min', '15min', '30min', '1hour']
    if (data.sync_frequency && !validFrequencies.includes(data.sync_frequency)) {
      throw new Error('sync_frequency must be one of: ' + validFrequencies.join(', '))
    }

    if (data.selected_calendars && data.selected_calendars.length > 10) {
      throw new Error('selected_calendars cannot exceed 10 items')
    }
  }
}

// 通知ファクトリー
export interface NotificationTemplate {
  type: 'email' | 'push' | 'in_app'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
  actionUrl?: string
}

export class NotificationFactory extends BaseFactory<NotificationTemplate> {
  create(
    type: NotificationTemplate['type'],
    context: any
  ): NotificationTemplate {
    this.log('Creating notification', { type, context })

    switch (type) {
      case 'task_due_reminder':
        return this.createTaskDueReminder(context)
      case 'task_completed':
        return this.createTaskCompleted(context)
      case 'sync_error':
        return this.createSyncError(context)
      case 'welcome':
        return this.createWelcome(context)
      default:
        throw new Error(`Unknown notification type: ${type}`)
    }
  }

  private createTaskDueReminder(task: any): NotificationTemplate {
    const dueDate = new Date(task.due_date)
    const now = new Date()
    const hoursUntilDue = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60))

    return {
      type: 'push',
      title: 'Task Due Soon',
      message: `"${task.title}" is due in ${hoursUntilDue} hours`,
      priority: hoursUntilDue <= 1 ? 'high' : 'medium',
      actionUrl: `/tasks/${task.id}`
    }
  }

  private createTaskCompleted(task: any): NotificationTemplate {
    return {
      type: 'in_app',
      title: 'Task Completed!',
      message: `Great job completing "${task.title}"`,
      priority: 'low'
    }
  }

  private createSyncError(error: any): NotificationTemplate {
    return {
      type: 'email',
      title: 'Sync Error',
      message: `Google Calendar sync failed: ${error.message}`,
      priority: 'high',
      actionUrl: '/settings/calendar'
    }
  }

  private createWelcome(user: any): NotificationTemplate {
    return {
      type: 'email',
      title: 'Welcome to TaskShoot!',
      message: `Hi ${user.name}, welcome to TaskShoot! Let's get started with your first task.`,
      priority: 'medium',
      actionUrl: '/dashboard'
    }
  }
}

// ファクトリーレジストリ
export class FactoryRegistry {
  private static factories = new Map<string, Factory<any>>()

  static register<T>(name: string, factory: Factory<T>): void {
    this.factories.set(name, factory)
    logger.debug(`Factory registered: ${name}`)
  }

  static get<T>(name: string): Factory<T> {
    const factory = this.factories.get(name)
    if (!factory) {
      throw new Error(`Factory not found: ${name}`)
    }
    return factory
  }

  static has(name: string): boolean {
    return this.factories.has(name)
  }

  static list(): string[] {
    return Array.from(this.factories.keys())
  }
}

// デフォルトファクトリーの登録
export function registerDefaultFactories(): void {
  FactoryRegistry.register('task', new TaskFactory())
  FactoryRegistry.register('category', new CategoryFactory())
  FactoryRegistry.register('googleCalendarConfig', new GoogleCalendarConfigFactory())
  FactoryRegistry.register('notification', new NotificationFactory())
  
  logger.info('Default factories registered', {
    factories: FactoryRegistry.list()
  })
}

// エクスポート用のファクトリーインスタンス
export const taskFactory = new TaskFactory()
export const categoryFactory = new CategoryFactory()
export const googleCalendarConfigFactory = new GoogleCalendarConfigFactory()
export const notificationFactory = new NotificationFactory()