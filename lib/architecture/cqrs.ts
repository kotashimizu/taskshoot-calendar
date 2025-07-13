/**
 * CQRS (Command Query Responsibility Segregation) Pattern
 * コマンドとクエリの責任分離によるアーキテクチャ
 */

import { logger } from '@/lib/logger'
import { ValidationResult, ValidationContext } from './validation'
import { DomainEvent, EventDispatcher } from './events'
import { IUnitOfWork } from './repositories'
import { Task, TaskWithCategory, Category } from '@/types/tasks'
import { GoogleCalendarConfig } from '@/types/google-calendar'

// 基底コマンドインターフェース
export interface Command {
  readonly commandId: string
  readonly timestamp: Date
  readonly userId: string
  readonly metadata?: Record<string, any>
}

// 基底クエリインターフェース
export interface Query {
  readonly queryId: string
  readonly timestamp: Date
  readonly userId?: string
  readonly metadata?: Record<string, any>
}

// コマンド結果
export interface CommandResult<T = any> {
  success: boolean
  data?: T
  events?: DomainEvent[]
  errors?: string[]
  warnings?: string[]
  metadata?: Record<string, any>
}

// クエリ結果
export interface QueryResult<T = any> {
  success: boolean
  data?: T
  metadata?: Record<string, any>
  cacheHit?: boolean
  executionTime?: number
}

// コマンドハンドラーインターフェース
export interface CommandHandler<TCommand extends Command, TResult = any> {
  handle(command: TCommand): Promise<CommandResult<TResult>>
}

// クエリハンドラーインターフェース
export interface QueryHandler<TQuery extends Query, TResult = any> {
  handle(query: TQuery): Promise<QueryResult<TResult>>
}

// コマンドバス
export interface CommandBus {
  send<TResult = any>(command: Command): Promise<CommandResult<TResult>>
  register<TCommand extends Command, TResult = any>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>
  ): void
}

// クエリバス
export interface QueryBus {
  send<TResult = any>(query: Query): Promise<QueryResult<TResult>>
  register<TQuery extends Query, TResult = any>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void
}

// タスク関連コマンド
export class CreateTaskCommand implements Command {
  public readonly commandId = crypto.randomUUID()
  public readonly timestamp = new Date()

  constructor(
    public readonly userId: string,
    public readonly taskData: {
      title: string
      description?: string
      priority: 'low' | 'medium' | 'high' | 'urgent'
      due_date?: string
      category_id?: string
      estimated_minutes?: number
      tags?: string[]
      notes?: string
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class UpdateTaskCommand implements Command {
  public readonly commandId = crypto.randomUUID()
  public readonly timestamp = new Date()

  constructor(
    public readonly userId: string,
    public readonly taskId: string,
    public readonly updates: Partial<{
      title: string
      description: string
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
      priority: 'low' | 'medium' | 'high' | 'urgent'
      due_date: string
      category_id: string
      estimated_minutes: number
      actual_minutes: number
      tags: string[]
      notes: string
    }>,
    public readonly metadata?: Record<string, any>
  ) {}
}

export class DeleteTaskCommand implements Command {
  public readonly commandId = crypto.randomUUID()
  public readonly timestamp = new Date()

  constructor(
    public readonly userId: string,
    public readonly taskId: string,
    public readonly metadata?: Record<string, any>
  ) {}
}

export class CompleteTaskCommand implements Command {
  public readonly commandId = crypto.randomUUID()
  public readonly timestamp = new Date()

  constructor(
    public readonly userId: string,
    public readonly taskId: string,
    public readonly actualMinutes?: number,
    public readonly notes?: string,
    public readonly metadata?: Record<string, any>
  ) {}
}

// タスク関連クエリ
export class GetTasksQuery implements Query {
  public readonly queryId = crypto.randomUUID()
  public readonly timestamp = new Date()

  constructor(
    public readonly userId: string,
    public readonly filters?: {
      status?: string[]
      priority?: string[]
      category_id?: string[]
      due_date_from?: string
      due_date_to?: string
      search?: string
    },
    public readonly sort?: {
      field: string
      direction: 'asc' | 'desc'
    },
    public readonly pagination?: {
      limit: number
      offset: number
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class GetTaskByIdQuery implements Query {
  public readonly queryId = crypto.randomUUID()
  public readonly timestamp = new Date()

  constructor(
    public readonly userId: string,
    public readonly taskId: string,
    public readonly metadata?: Record<string, any>
  ) {}
}

export class GetTaskStatsQuery implements Query {
  public readonly queryId = crypto.randomUUID()
  public readonly timestamp = new Date()

  constructor(
    public readonly userId: string,
    public readonly metadata?: Record<string, any>
  ) {}
}

export class GetOverdueTasksQuery implements Query {
  public readonly queryId = crypto.randomUUID()
  public readonly timestamp = new Date()

  constructor(
    public readonly userId: string,
    public readonly metadata?: Record<string, any>
  ) {}
}

// Google Calendar関連コマンド
export class ConnectGoogleCalendarCommand implements Command {
  public readonly commandId = crypto.randomUUID()
  public readonly timestamp = new Date()

  constructor(
    public readonly userId: string,
    public readonly authCode: string,
    public readonly state: string,
    public readonly metadata?: Record<string, any>
  ) {}
}

export class SyncGoogleCalendarCommand implements Command {
  public readonly commandId = crypto.randomUUID()
  public readonly timestamp = new Date()

  constructor(
    public readonly userId: string,
    public readonly syncDirection: 'both' | 'gcal_to_taskshoot' | 'taskshoot_to_gcal',
    public readonly calendarIds: string[],
    public readonly metadata?: Record<string, any>
  ) {}
}

// コマンドバス実装
export class InMemoryCommandBus implements CommandBus {
  private handlers = new Map<string, CommandHandler<any, any>>()

  async send<TResult = any>(command: Command): Promise<CommandResult<TResult>> {
    const commandType = command.constructor.name
    const handler = this.handlers.get(commandType)

    if (!handler) {
      logger.error(`No handler registered for command: ${commandType}`)
      return {
        success: false,
        errors: [`No handler registered for command: ${commandType}`]
      }
    }

    const startTime = Date.now()

    try {
      logger.debug(`Executing command: ${commandType}`, {
        commandId: command.commandId,
        userId: command.userId,
        timestamp: command.timestamp
      })

      const result = await handler.handle(command)
      const executionTime = Date.now() - startTime

      logger.info(`Command executed successfully: ${commandType}`, {
        commandId: command.commandId,
        userId: command.userId,
        executionTime,
        success: result.success,
        eventCount: result.events?.length || 0
      })

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime

      logger.error(`Command execution failed: ${commandType}`, {
        commandId: command.commandId,
        userId: command.userId,
        executionTime,
        error
      })

      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  register<TCommand extends Command, TResult = any>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>
  ): void {
    if (this.handlers.has(commandType)) {
      logger.warn(`Handler for command ${commandType} is being overwritten`)
    }

    this.handlers.set(commandType, handler)
    logger.debug(`Command handler registered: ${commandType}`)
  }
}

// クエリバス実装
export class InMemoryQueryBus implements QueryBus {
  private handlers = new Map<string, QueryHandler<any, any>>()
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  async send<TResult = any>(query: Query): Promise<QueryResult<TResult>> {
    const queryType = query.constructor.name
    const handler = this.handlers.get(queryType)

    if (!handler) {
      logger.error(`No handler registered for query: ${queryType}`)
      return {
        success: false,
        metadata: { error: `No handler registered for query: ${queryType}` }
      }
    }

    const startTime = Date.now()

    try {
      // キャッシュチェック
      const cacheKey = this.generateCacheKey(query)
      const cachedResult = this.getFromCache(cacheKey)

      if (cachedResult) {
        const executionTime = Date.now() - startTime
        
        logger.debug(`Query served from cache: ${queryType}`, {
          queryId: query.queryId,
          userId: query.userId,
          executionTime
        })

        return {
          success: true,
          data: cachedResult,
          cacheHit: true,
          executionTime
        }
      }

      logger.debug(`Executing query: ${queryType}`, {
        queryId: query.queryId,
        userId: query.userId,
        timestamp: query.timestamp
      })

      const result = await handler.handle(query)
      const executionTime = Date.now() - startTime

      // 成功した場合はキャッシュに保存
      if (result.success && result.data) {
        this.setCache(cacheKey, result.data, 300000) // 5分間キャッシュ
      }

      logger.info(`Query executed successfully: ${queryType}`, {
        queryId: query.queryId,
        userId: query.userId,
        executionTime,
        success: result.success,
        cacheHit: false
      })

      return {
        ...result,
        cacheHit: false,
        executionTime
      }

    } catch (error) {
      const executionTime = Date.now() - startTime

      logger.error(`Query execution failed: ${queryType}`, {
        queryId: query.queryId,
        userId: query.userId,
        executionTime,
        error
      })

      return {
        success: false,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  register<TQuery extends Query, TResult = any>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    if (this.handlers.has(queryType)) {
      logger.warn(`Handler for query ${queryType} is being overwritten`)
    }

    this.handlers.set(queryType, handler)
    logger.debug(`Query handler registered: ${queryType}`)
  }

  private generateCacheKey(query: Query): string {
    // クエリの内容に基づいてキャッシュキーを生成
    const queryData = { ...query }
    delete (queryData as any).queryId
    delete (queryData as any).timestamp
    return `${query.constructor.name}:${JSON.stringify(queryData)}`
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  clearCache(): void {
    this.cache.clear()
    logger.debug('Query cache cleared')
  }
}

// コマンドハンドラーの基底クラス
export abstract class BaseCommandHandler<TCommand extends Command, TResult = any> 
  implements CommandHandler<TCommand, TResult> {
  
  constructor(
    protected unitOfWork: IUnitOfWork,
    protected eventDispatcher: EventDispatcher
  ) {}

  abstract handle(command: TCommand): Promise<CommandResult<TResult>>

  protected async publishEvents(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.eventDispatcher.dispatch(event)
    }
  }

  protected createSuccessResult(
    data?: TResult,
    events: DomainEvent[] = [],
    warnings: string[] = []
  ): CommandResult<TResult> {
    return {
      success: true,
      data,
      events,
      warnings
    }
  }

  protected createErrorResult(
    errors: string[],
    warnings: string[] = []
  ): CommandResult<TResult> {
    return {
      success: false,
      errors,
      warnings
    }
  }
}

// クエリハンドラーの基底クラス
export abstract class BaseQueryHandler<TQuery extends Query, TResult = any> 
  implements QueryHandler<TQuery, TResult> {
  
  constructor(protected unitOfWork: IUnitOfWork) {}

  abstract handle(query: TQuery): Promise<QueryResult<TResult>>

  protected createSuccessResult(
    data: TResult,
    metadata?: Record<string, any>
  ): QueryResult<TResult> {
    return {
      success: true,
      data,
      metadata
    }
  }

  protected createErrorResult(
    error: string,
    metadata?: Record<string, any>
  ): QueryResult<TResult> {
    return {
      success: false,
      metadata: {
        error,
        ...metadata
      }
    }
  }
}

// CQRS メディエーター
export class CQRSMediator {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus
  ) {}

  async sendCommand<TResult = any>(command: Command): Promise<CommandResult<TResult>> {
    return this.commandBus.send<TResult>(command)
  }

  async sendQuery<TResult = any>(query: Query): Promise<QueryResult<TResult>> {
    return this.queryBus.send<TResult>(query)
  }

  // ヘルパーメソッド
  async createTask(
    userId: string,
    taskData: CreateTaskCommand['taskData']
  ): Promise<CommandResult<TaskWithCategory>> {
    const command = new CreateTaskCommand(userId, taskData)
    return this.sendCommand<TaskWithCategory>(command)
  }

  async updateTask(
    userId: string,
    taskId: string,
    updates: UpdateTaskCommand['updates']
  ): Promise<CommandResult<TaskWithCategory>> {
    const command = new UpdateTaskCommand(userId, taskId, updates)
    return this.sendCommand<TaskWithCategory>(command)
  }

  async deleteTask(userId: string, taskId: string): Promise<CommandResult<void>> {
    const command = new DeleteTaskCommand(userId, taskId)
    return this.sendCommand<void>(command)
  }

  async completeTask(
    userId: string,
    taskId: string,
    actualMinutes?: number,
    notes?: string
  ): Promise<CommandResult<TaskWithCategory>> {
    const command = new CompleteTaskCommand(userId, taskId, actualMinutes, notes)
    return this.sendCommand<TaskWithCategory>(command)
  }

  async getTasks(
    userId: string,
    filters?: GetTasksQuery['filters'],
    sort?: GetTasksQuery['sort'],
    pagination?: GetTasksQuery['pagination']
  ): Promise<QueryResult<TaskWithCategory[]>> {
    const query = new GetTasksQuery(userId, filters, sort, pagination)
    return this.sendQuery<TaskWithCategory[]>(query)
  }

  async getTaskById(userId: string, taskId: string): Promise<QueryResult<TaskWithCategory | null>> {
    const query = new GetTaskByIdQuery(userId, taskId)
    return this.sendQuery<TaskWithCategory | null>(query)
  }

  async getTaskStats(userId: string): Promise<QueryResult<any>> {
    const query = new GetTaskStatsQuery(userId)
    return this.sendQuery<any>(query)
  }

  async getOverdueTasks(userId: string): Promise<QueryResult<TaskWithCategory[]>> {
    const query = new GetOverdueTasksQuery(userId)
    return this.sendQuery<TaskWithCategory[]>(query)
  }
}

// グローバルインスタンス
export const commandBus = new InMemoryCommandBus()
export const queryBus = new InMemoryQueryBus()
export const mediator = new CQRSMediator(commandBus, queryBus)

// ヘルパー関数
export function createCommand<T extends Command>(
  CommandClass: new (...args: any[]) => T,
  ...args: any[]
): T {
  return new CommandClass(...args)
}

export function createQuery<T extends Query>(
  QueryClass: new (...args: any[]) => T,
  ...args: any[]
): T {
  return new QueryClass(...args)
}