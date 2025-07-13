/**
 * エンタープライズレベルバリデーションシステム
 * Strategy Pattern + Builder Pattern による柔軟なバリデーション
 */

import { z, ZodSchema, ZodError } from 'zod'
import { logger } from '@/lib/logger'

// バリデーション結果の型定義
export interface ValidationResult<T = any> {
  success: boolean
  data?: T
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  severity: 'error' | 'critical'
  value?: any
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
  suggestion?: string
}

// バリデーションコンテキスト
export interface ValidationContext {
  userId?: string
  operation: 'create' | 'update' | 'delete' | 'read'
  timestamp: Date
  metadata?: Record<string, any>
}

// バリデーションルールインターフェース
export interface ValidationRule<T = any> {
  name: string
  description: string
  validate(value: T, context: ValidationContext): Promise<ValidationResult<T>> | ValidationResult<T>
}

// バリデータビルダー
export class ValidationBuilder<T> {
  private rules: ValidationRule<T>[] = []
  private schema?: ZodSchema<T>

  constructor(private entityName: string) {}

  // Zodスキーマを設定
  withSchema(schema: ZodSchema<T>): this {
    this.schema = schema
    return this
  }

  // カスタムルールを追加
  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule)
    return this
  }

  // ビルトインルールを追加
  required(field: keyof T, message?: string): this {
    return this.addRule(new RequiredFieldRule(field as string, message))
  }

  minLength(field: keyof T, minLength: number, message?: string): this {
    return this.addRule(new MinLengthRule(field as string, minLength, message))
  }

  maxLength(field: keyof T, maxLength: number, message?: string): this {
    return this.addRule(new MaxLengthRule(field as string, maxLength, message))
  }

  email(field: keyof T, message?: string): this {
    return this.addRule(new EmailRule(field as string, message))
  }

  date(field: keyof T, message?: string): this {
    return this.addRule(new DateRule(field as string, message))
  }

  custom(name: string, validator: (value: T, context: ValidationContext) => ValidationResult<T>): this {
    return this.addRule({
      name,
      description: `Custom validation: ${name}`,
      validate: validator
    })
  }

  // バリデータを構築
  build(): Validator<T> {
    return new Validator(this.entityName, this.schema, this.rules)
  }
}

// メインバリデータクラス
export class Validator<T> {
  constructor(
    private entityName: string,
    private schema?: ZodSchema<T>,
    private rules: ValidationRule<T>[] = []
  ) {}

  async validate(value: T, context: ValidationContext): Promise<ValidationResult<T>> {
    const startTime = Date.now()
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    let validatedData = value

    try {
      // 1. Zodスキーマバリデーション
      if (this.schema) {
        try {
          validatedData = this.schema.parse(value)
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...this.convertZodErrors(error))
          } else {
            errors.push({
              field: 'schema',
              message: 'Schema validation failed',
              code: 'SCHEMA_ERROR',
              severity: 'critical'
            })
          }
        }
      }

      // 2. カスタムルールバリデーション
      for (const rule of this.rules) {
        try {
          const result = await rule.validate(validatedData, context)
          errors.push(...result.errors)
          warnings.push(...result.warnings)
        } catch (error) {
          logger.error(`Validation rule failed: ${rule.name}`, {
            entity: this.entityName,
            rule: rule.name,
            error
          })
          
          errors.push({
            field: 'rule',
            message: `Validation rule "${rule.name}" failed`,
            code: 'RULE_EXECUTION_ERROR',
            severity: 'critical'
          })
        }
      }

      const result: ValidationResult<T> = {
        success: errors.length === 0,
        data: validatedData,
        errors,
        warnings
      }

      // ログ記録
      const duration = Date.now() - startTime
      logger.debug(`Validation completed for ${this.entityName}`, {
        success: result.success,
        errorCount: errors.length,
        warningCount: warnings.length,
        duration,
        context
      })

      return result

    } catch (error) {
      logger.error(`Validation system error for ${this.entityName}`, {
        error,
        context
      })

      return {
        success: false,
        errors: [{
          field: 'system',
          message: 'Validation system error',
          code: 'SYSTEM_ERROR',
          severity: 'critical'
        }],
        warnings: []
      }
    }
  }

  private convertZodErrors(zodError: ZodError): ValidationError[] {
    return zodError.errors.map(error => ({
      field: error.path.join('.') || 'root',
      message: error.message,
      code: error.code.toUpperCase(),
      severity: 'error' as const,
      value: error.received
    }))
  }
}

// ビルトインバリデーションルール

export class RequiredFieldRule<T> implements ValidationRule<T> {
  public readonly name = 'required'
  public readonly description: string

  constructor(
    private field: string,
    private message?: string
  ) {
    this.description = `Field '${field}' is required`
  }

  validate(value: T): ValidationResult<T> {
    const fieldValue = (value as any)[this.field]
    const errors: ValidationError[] = []

    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      errors.push({
        field: this.field,
        message: this.message || `${this.field} is required`,
        code: 'REQUIRED_FIELD_MISSING',
        severity: 'error',
        value: fieldValue
      })
    }

    return { success: errors.length === 0, errors, warnings: [] }
  }
}

export class MinLengthRule<T> implements ValidationRule<T> {
  public readonly name = 'minLength'
  public readonly description: string

  constructor(
    private field: string,
    private minLength: number,
    private message?: string
  ) {
    this.description = `Field '${field}' must have at least ${minLength} characters`
  }

  validate(value: T): ValidationResult<T> {
    const fieldValue = (value as any)[this.field]
    const errors: ValidationError[] = []

    if (typeof fieldValue === 'string' && fieldValue.length < this.minLength) {
      errors.push({
        field: this.field,
        message: this.message || `${this.field} must be at least ${this.minLength} characters long`,
        code: 'MIN_LENGTH_VIOLATION',
        severity: 'error',
        value: fieldValue
      })
    }

    return { success: errors.length === 0, errors, warnings: [] }
  }
}

export class MaxLengthRule<T> implements ValidationRule<T> {
  public readonly name = 'maxLength'
  public readonly description: string

  constructor(
    private field: string,
    private maxLength: number,
    private message?: string
  ) {
    this.description = `Field '${field}' must have at most ${maxLength} characters`
  }

  validate(value: T): ValidationResult<T> {
    const fieldValue = (value as any)[this.field]
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (typeof fieldValue === 'string') {
      if (fieldValue.length > this.maxLength) {
        errors.push({
          field: this.field,
          message: this.message || `${this.field} must be at most ${this.maxLength} characters long`,
          code: 'MAX_LENGTH_VIOLATION',
          severity: 'error',
          value: fieldValue
        })
      } else if (fieldValue.length > this.maxLength * 0.9) {
        // 90%に達した場合は警告
        warnings.push({
          field: this.field,
          message: `${this.field} is approaching the maximum length limit`,
          code: 'APPROACHING_MAX_LENGTH',
          suggestion: `Consider shortening the ${this.field} to stay well within the limit`
        })
      }
    }

    return { success: errors.length === 0, errors, warnings }
  }
}

export class EmailRule<T> implements ValidationRule<T> {
  public readonly name = 'email'
  public readonly description: string

  constructor(
    private field: string,
    private message?: string
  ) {
    this.description = `Field '${field}' must be a valid email address`
  }

  validate(value: T): ValidationResult<T> {
    const fieldValue = (value as any)[this.field]
    const errors: ValidationError[] = []

    if (typeof fieldValue === 'string' && fieldValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(fieldValue)) {
        errors.push({
          field: this.field,
          message: this.message || `${this.field} must be a valid email address`,
          code: 'INVALID_EMAIL_FORMAT',
          severity: 'error',
          value: fieldValue
        })
      }
    }

    return { success: errors.length === 0, errors, warnings: [] }
  }
}

export class DateRule<T> implements ValidationRule<T> {
  public readonly name = 'date'
  public readonly description: string

  constructor(
    private field: string,
    private message?: string
  ) {
    this.description = `Field '${field}' must be a valid date`
  }

  validate(value: T): ValidationResult<T> {
    const fieldValue = (value as any)[this.field]
    const errors: ValidationError[] = []

    if (fieldValue && !(fieldValue instanceof Date) && isNaN(Date.parse(fieldValue))) {
      errors.push({
        field: this.field,
        message: this.message || `${this.field} must be a valid date`,
        code: 'INVALID_DATE_FORMAT',
        severity: 'error',
        value: fieldValue
      })
    }

    return { success: errors.length === 0, errors, warnings: [] }
  }
}

// タスク固有のバリデーションルール
export class TaskDueDateRule implements ValidationRule<any> {
  public readonly name = 'taskDueDate'
  public readonly description = 'Task due date must be in the future or today'

  validate(value: any): ValidationResult<any> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (value.due_date) {
      const dueDate = new Date(value.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (dueDate < today) {
        errors.push({
          field: 'due_date',
          message: 'Due date cannot be in the past',
          code: 'PAST_DUE_DATE',
          severity: 'error',
          value: value.due_date
        })
      } else if (dueDate.getTime() === today.getTime()) {
        warnings.push({
          field: 'due_date',
          message: 'Task is due today',
          code: 'DUE_TODAY',
          suggestion: 'Consider setting a specific time for today\'s tasks'
        })
      }
    }

    return { success: errors.length === 0, errors, warnings }
  }
}

export class TaskEstimateRule implements ValidationRule<any> {
  public readonly name = 'taskEstimate'
  public readonly description = 'Task estimate should be reasonable'

  validate(value: any): ValidationResult<any> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (value.estimated_minutes !== undefined) {
      if (value.estimated_minutes < 0) {
        errors.push({
          field: 'estimated_minutes',
          message: 'Estimated time cannot be negative',
          code: 'NEGATIVE_ESTIMATE',
          severity: 'error',
          value: value.estimated_minutes
        })
      } else if (value.estimated_minutes > 480) { // 8時間以上
        warnings.push({
          field: 'estimated_minutes',
          message: 'Task estimate exceeds 8 hours',
          code: 'LONG_ESTIMATE',
          suggestion: 'Consider breaking this task into smaller subtasks'
        })
      }
    }

    return { success: errors.length === 0, errors, warnings }
  }
}

// バリデーションファクトリー
export class ValidationFactory {
  static createTaskValidator(): Validator<any> {
    const taskSchema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      due_date: z.string().datetime().optional(),
      estimated_minutes: z.number().min(0).max(10080).optional(), // 最大1週間
      actual_minutes: z.number().min(0).optional(),
      tags: z.array(z.string().max(50)).max(10).optional(),
      notes: z.string().max(2000).optional(),
      category_id: z.string().uuid().optional()
    })

    return new ValidationBuilder<any>('Task')
      .withSchema(taskSchema)
      .addRule(new TaskDueDateRule())
      .addRule(new TaskEstimateRule())
      .build()
  }

  static createCategoryValidator(): Validator<any> {
    const categorySchema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      icon: z.string().max(50).optional(),
      sort_order: z.number().min(0).optional(),
      is_active: z.boolean().optional()
    })

    return new ValidationBuilder<any>('Category')
      .withSchema(categorySchema)
      .build()
  }

  static createGoogleCalendarConfigValidator(): Validator<any> {
    const configSchema = z.object({
      enabled: z.boolean(),
      sync_direction: z.enum(['both', 'gcal_to_taskshoot', 'taskshoot_to_gcal']),
      sync_frequency: z.enum(['manual', '5min', '15min', '30min', '1hour']),
      auto_sync_enabled: z.boolean(),
      selected_calendars: z.array(z.string()).max(10),
      last_sync_at: z.string().datetime().optional(),
      sync_status: z.enum(['idle', 'syncing', 'success', 'error']).optional()
    })

    return new ValidationBuilder<any>('GoogleCalendarConfig')
      .withSchema(configSchema)
      .build()
  }
}

// バリデーション結果のヘルパー関数
export function formatValidationErrors(result: ValidationResult): string {
  if (result.success) return ''
  
  return result.errors
    .map(error => `${error.field}: ${error.message}`)
    .join(', ')
}

export function hasValidationErrors(result: ValidationResult): boolean {
  return !result.success || result.errors.length > 0
}

export function hasValidationWarnings(result: ValidationResult): boolean {
  return result.warnings.length > 0
}

export function getCriticalErrors(result: ValidationResult): ValidationError[] {
  return result.errors.filter(error => error.severity === 'critical')
}

// グローバルバリデータインスタンス
export const taskValidator = ValidationFactory.createTaskValidator()
export const categoryValidator = ValidationFactory.createCategoryValidator()
export const googleCalendarConfigValidator = ValidationFactory.createGoogleCalendarConfigValidator()

// バリデーション統計の収集
export class ValidationMetrics {
  private static validationCounts = new Map<string, number>()
  private static errorCounts = new Map<string, number>()
  private static validationTimes = new Map<string, number[]>()

  static recordValidation(entityName: string, duration: number, success: boolean): void {
    // カウント更新
    const currentCount = this.validationCounts.get(entityName) || 0
    this.validationCounts.set(entityName, currentCount + 1)

    if (!success) {
      const currentErrors = this.errorCounts.get(entityName) || 0
      this.errorCounts.set(entityName, currentErrors + 1)
    }

    // 時間記録
    const times = this.validationTimes.get(entityName) || []
    times.push(duration)
    if (times.length > 100) times.shift() // 最新100件のみ保持
    this.validationTimes.set(entityName, times)
  }

  static getMetrics() {
    const metrics: Record<string, any> = {}

    for (const [entityName, count] of this.validationCounts.entries()) {
      const errors = this.errorCounts.get(entityName) || 0
      const times = this.validationTimes.get(entityName) || []
      const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0

      metrics[entityName] = {
        totalValidations: count,
        errorCount: errors,
        successRate: ((count - errors) / count * 100).toFixed(2) + '%',
        averageTime: Math.round(avgTime) + 'ms'
      }
    }

    return metrics
  }

  static reset(): void {
    this.validationCounts.clear()
    this.errorCounts.clear()
    this.validationTimes.clear()
  }
}