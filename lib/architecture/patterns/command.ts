/**
 * コマンドパターン実装
 * 操作の実行、取り消し、やり直し機能
 */

import { logger } from '@/lib/logger'

// コマンドインターフェース
export interface Command {
  id: string
  name: string
  description?: string
  timestamp: Date
  execute(): Promise<CommandResult> | CommandResult
  undo?(): Promise<CommandResult> | CommandResult
  redo?(): Promise<CommandResult> | CommandResult
  canUndo?(): boolean
  canRedo?(): boolean
  getData?(): any
}

// コマンド実行結果
export interface CommandResult {
  success: boolean
  data?: any
  message?: string
  errors?: string[]
  metadata?: Record<string, any>
}

// コマンド履歴エントリ
export interface CommandHistoryEntry {
  command: Command
  result: CommandResult
  executedAt: Date
  undoneAt?: Date
  redoneAt?: Date
  status: 'executed' | 'undone' | 'redone' | 'failed'
}

// コマンドインボーカー（実行者）
export class CommandInvoker {
  private history: CommandHistoryEntry[] = []
  private currentIndex = -1
  private maxHistorySize: number

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize
  }

  /**
   * コマンドを実行
   */
  async execute(command: Command): Promise<CommandResult> {
    try {
      logger.debug(`Executing command: ${command.name}`, { commandId: command.id })
      
      const result = await command.execute()
      const entry: CommandHistoryEntry = {
        command,
        result,
        executedAt: new Date(),
        status: result.success ? 'executed' : 'failed'
      }

      if (result.success) {
        // 現在位置以降の履歴を削除（新しいブランチ）
        this.history = this.history.slice(0, this.currentIndex + 1)
        
        // 新しいエントリを追加
        this.history.push(entry)
        this.currentIndex++

        // 履歴サイズ制限
        this.trimHistory()
      }

      logger.info(`Command executed: ${command.name}`, {
        commandId: command.id,
        success: result.success,
        message: result.message
      })

      return result

    } catch (error) {
      const errorResult: CommandResult = {
        success: false,
        errors: [(error as Error).message],
        message: `Command execution failed: ${command.name}`
      }

      logger.error(`Command execution failed: ${command.name}`, {
        commandId: command.id,
        error
      })

      return errorResult
    }
  }

  /**
   * 最後のコマンドを取り消し
   */
  async undo(): Promise<CommandResult | null> {
    if (!this.canUndo()) {
      return null
    }

    const entry = this.history[this.currentIndex]
    const command = entry.command

    if (!command.undo) {
      return {
        success: false,
        message: 'Command does not support undo',
        errors: [`Command ${command.name} does not implement undo`]
      }
    }

    try {
      logger.debug(`Undoing command: ${command.name}`, { commandId: command.id })
      
      const result = await command.undo()
      
      if (result.success) {
        entry.undoneAt = new Date()
        entry.status = 'undone'
        this.currentIndex--
      }

      logger.info(`Command undone: ${command.name}`, {
        commandId: command.id,
        success: result.success
      })

      return result

    } catch (error) {
      logger.error(`Command undo failed: ${command.name}`, {
        commandId: command.id,
        error
      })

      return {
        success: false,
        errors: [(error as Error).message],
        message: `Undo failed: ${command.name}`
      }
    }
  }

  /**
   * コマンドをやり直し
   */
  async redo(): Promise<CommandResult | null> {
    if (!this.canRedo()) {
      return null
    }

    const entry = this.history[this.currentIndex + 1]
    const command = entry.command

    if (!command.redo) {
      // redoが実装されていない場合はexecuteを使用
      return this.execute(command)
    }

    try {
      logger.debug(`Redoing command: ${command.name}`, { commandId: command.id })
      
      const result = await command.redo()
      
      if (result.success) {
        entry.redoneAt = new Date()
        entry.status = 'redone'
        this.currentIndex++
      }

      logger.info(`Command redone: ${command.name}`, {
        commandId: command.id,
        success: result.success
      })

      return result

    } catch (error) {
      logger.error(`Command redo failed: ${command.name}`, {
        commandId: command.id,
        error
      })

      return {
        success: false,
        errors: [(error as Error).message],
        message: `Redo failed: ${command.name}`
      }
    }
  }

  /**
   * アンドゥ可能かチェック
   */
  canUndo(): boolean {
    return this.currentIndex >= 0 && 
           this.history[this.currentIndex]?.status === 'executed'
  }

  /**
   * リドゥ可能かチェック
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1 &&
           this.history[this.currentIndex + 1]?.status === 'undone'
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.history = []
    this.currentIndex = -1
    logger.debug('Command history cleared')
  }

  /**
   * 履歴を取得
   */
  getHistory(): CommandHistoryEntry[] {
    return [...this.history]
  }

  /**
   * 現在の状態を取得
   */
  getState() {
    return {
      historySize: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      lastCommand: this.history[this.currentIndex]?.command.name
    }
  }

  private trimHistory(): void {
    if (this.history.length > this.maxHistorySize) {
      const excess = this.history.length - this.maxHistorySize
      this.history.splice(0, excess)
      this.currentIndex -= excess
    }
  }
}

// 基底コマンド実装
export abstract class BaseCommand implements Command {
  public readonly id = crypto.randomUUID()
  public readonly timestamp = new Date()
  
  constructor(
    public readonly name: string,
    public readonly description?: string
  ) {}

  abstract execute(): Promise<CommandResult> | CommandResult

  undo?(): Promise<CommandResult> | CommandResult {
    return {
      success: false,
      message: 'Undo not implemented',
      errors: [`Command ${this.name} does not support undo`]
    }
  }

  redo?(): Promise<CommandResult> | CommandResult {
    return this.execute()
  }

  canUndo?(): boolean {
    return this.undo !== undefined
  }

  canRedo?(): boolean {
    return true
  }

  getData?(): any {
    return {}
  }
}

// タスク作成コマンド
export class CreateTaskCommand extends BaseCommand {
  private createdTask?: any

  constructor(
    private taskData: any,
    private taskService: any
  ) {
    super('create_task', `Create task: ${taskData.title}`)
  }

  async execute(): Promise<CommandResult> {
    try {
      this.createdTask = await this.taskService.createTask(this.taskData.user_id, this.taskData)
      
      return {
        success: true,
        data: this.createdTask,
        message: `Task "${this.taskData.title}" created successfully`
      }
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        message: 'Failed to create task'
      }
    }
  }

  async undo(): Promise<CommandResult> {
    if (!this.createdTask) {
      return {
        success: false,
        message: 'No task to undo'
      }
    }

    try {
      await this.taskService.deleteTask(this.taskData.user_id, this.createdTask.id)
      
      return {
        success: true,
        message: `Task "${this.taskData.title}" deleted (undo)`
      }
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        message: 'Failed to undo task creation'
      }
    }
  }

  getData() {
    return {
      taskData: this.taskData,
      createdTask: this.createdTask
    }
  }
}

// タスク更新コマンド
export class UpdateTaskCommand extends BaseCommand {
  private previousTaskData?: any

  constructor(
    private taskId: string,
    private userId: string,
    private updates: any,
    private taskService: any
  ) {
    super('update_task', `Update task: ${taskId}`)
  }

  async execute(): Promise<CommandResult> {
    try {
      // 現在のタスクデータを保存（undo用）
      this.previousTaskData = await this.taskService.getTaskById(this.userId, this.taskId)
      
      const updatedTask = await this.taskService.updateTask(this.userId, this.taskId, this.updates)
      
      return {
        success: true,
        data: updatedTask,
        message: 'Task updated successfully'
      }
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        message: 'Failed to update task'
      }
    }
  }

  async undo(): Promise<CommandResult> {
    if (!this.previousTaskData) {
      return {
        success: false,
        message: 'No previous task data to restore'
      }
    }

    try {
      await this.taskService.updateTask(this.userId, this.taskId, this.previousTaskData)
      
      return {
        success: true,
        message: 'Task update undone'
      }
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        message: 'Failed to undo task update'
      }
    }
  }

  getData() {
    return {
      taskId: this.taskId,
      updates: this.updates,
      previousTaskData: this.previousTaskData
    }
  }
}

// タスク削除コマンド
export class DeleteTaskCommand extends BaseCommand {
  private deletedTask?: any

  constructor(
    private taskId: string,
    private userId: string,
    private taskService: any
  ) {
    super('delete_task', `Delete task: ${taskId}`)
  }

  async execute(): Promise<CommandResult> {
    try {
      // 削除前にタスクデータを保存（undo用）
      this.deletedTask = await this.taskService.getTaskById(this.userId, this.taskId)
      
      await this.taskService.deleteTask(this.userId, this.taskId)
      
      return {
        success: true,
        data: { taskId: this.taskId },
        message: 'Task deleted successfully'
      }
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        message: 'Failed to delete task'
      }
    }
  }

  async undo(): Promise<CommandResult> {
    if (!this.deletedTask) {
      return {
        success: false,
        message: 'No task data to restore'
      }
    }

    try {
      const restoredTask = await this.taskService.createTask(this.userId, {
        ...this.deletedTask,
        id: this.taskId // 同じIDで復元
      })
      
      return {
        success: true,
        data: restoredTask,
        message: 'Task deletion undone'
      }
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        message: 'Failed to undo task deletion'
      }
    }
  }

  getData() {
    return {
      taskId: this.taskId,
      deletedTask: this.deletedTask
    }
  }
}

// 複合コマンド（マクロコマンド）
export class CompositeCommand extends BaseCommand {
  private executedCommands: Command[] = []

  constructor(
    name: string,
    private commands: Command[],
    description?: string
  ) {
    super(name, description)
  }

  async execute(): Promise<CommandResult> {
    const results: CommandResult[] = []
    const errors: string[] = []

    for (const command of this.commands) {
      try {
        const result = await command.execute()
        results.push(result)
        
        if (result.success) {
          this.executedCommands.push(command)
        } else {
          errors.push(...(result.errors || []))
          // エラーが発生した場合、実行済みコマンドを逆順でundo
          await this.rollback()
          break
        }
      } catch (error) {
        errors.push((error as Error).message)
        await this.rollback()
        break
      }
    }

    const success = errors.length === 0
    
    return {
      success,
      data: results,
      message: success ? 'All commands executed successfully' : 'Some commands failed',
      errors: errors.length > 0 ? errors : undefined
    }
  }

  async undo(): Promise<CommandResult> {
    const errors: string[] = []
    
    // 実行済みコマンドを逆順でundo
    for (let i = this.executedCommands.length - 1; i >= 0; i--) {
      const command = this.executedCommands[i]
      
      if (command.undo) {
        try {
          const result = await command.undo()
          if (!result.success && result.errors) {
            errors.push(...result.errors)
          }
        } catch (error) {
          errors.push((error as Error).message)
        }
      }
    }

    this.executedCommands = []

    return {
      success: errors.length === 0,
      message: errors.length === 0 ? 'All commands undone' : 'Some undo operations failed',
      errors: errors.length > 0 ? errors : undefined
    }
  }

  private async rollback(): Promise<void> {
    await this.undo()
  }

  getData() {
    return {
      commandCount: this.commands.length,
      executedCount: this.executedCommands.length,
      commands: this.commands.map(cmd => ({
        id: cmd.id,
        name: cmd.name,
        executed: this.executedCommands.includes(cmd)
      }))
    }
  }
}

// 遅延実行コマンド
export class DelayedCommand extends BaseCommand {
  private timeoutId?: NodeJS.Timeout

  constructor(
    private baseCommand: Command,
    private delayMs: number,
    name?: string
  ) {
    super(name || `delayed_${baseCommand.name}`, `Delayed execution of ${baseCommand.name}`)
  }

  async execute(): Promise<CommandResult> {
    return new Promise((resolve) => {
      this.timeoutId = setTimeout(async () => {
        try {
          const result = await this.baseCommand.execute()
          resolve(result)
        } catch (error) {
          resolve({
            success: false,
            errors: [(error as Error).message],
            message: 'Delayed command execution failed'
          })
        }
      }, this.delayMs)
    })
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }
  }

  async undo(): Promise<CommandResult> {
    this.cancel()
    
    if (this.baseCommand.undo) {
      return this.baseCommand.undo()
    }
    
    return {
      success: true,
      message: 'Delayed command cancelled'
    }
  }

  getData() {
    return {
      baseCommand: this.baseCommand.name,
      delayMs: this.delayMs,
      scheduled: !!this.timeoutId
    }
  }
}

// グローバルコマンドインボーカー
export const commandInvoker = new CommandInvoker(200)

// ヘルパー関数
export async function executeCommand(command: Command): Promise<CommandResult> {
  return commandInvoker.execute(command)
}

export async function undoLastCommand(): Promise<CommandResult | null> {
  return commandInvoker.undo()
}

export async function redoLastCommand(): Promise<CommandResult | null> {
  return commandInvoker.redo()
}

// コマンドパターンのエクスポート
export const CommandPattern = {
  Invoker: CommandInvoker,
  BaseCommand,
  CompositeCommand,
  DelayedCommand,
  
  // 具体的なコマンド
  CreateTaskCommand,
  UpdateTaskCommand,
  DeleteTaskCommand,
  
  // グローバルインスタンス
  commandInvoker,
  
  // ヘルパー関数
  executeCommand,
  undoLastCommand,
  redoLastCommand
}