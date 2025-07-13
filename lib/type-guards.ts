/**
 * 型ガード関数
 * 実行時の型安全性を確保
 */

import { TaskWithCategory, TaskPriority, TaskStatus } from '@/types/tasks'
import { GoogleCalendarConfig, CalendarListEntry } from '@/types/google-calendar'

/**
 * 文字列の型ガード
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * 数値の型ガード
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * ブール値の型ガード
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * オブジェクトの型ガード
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 配列の型ガード
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * TaskPriorityの型ガード
 */
export function isTaskPriority(value: unknown): value is TaskPriority {
  return isString(value) && ['low', 'medium', 'high', 'urgent'].includes(value)
}

/**
 * TaskStatusの型ガード
 */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return isString(value) && ['pending', 'in_progress', 'completed', 'cancelled'].includes(value)
}

/**
 * TaskWithCategoryの型ガード
 */
export function isTaskWithCategory(value: unknown): value is TaskWithCategory {
  if (!isObject(value)) return false

  const task = value as Record<string, unknown>
  
  return (
    isString(task.id) &&
    isString(task.title) &&
    isString(task.user_id) &&
    isTaskPriority(task.priority) &&
    isTaskStatus(task.status) &&
    isString(task.created_at) &&
    isString(task.updated_at) &&
    (task.description === null || isString(task.description)) &&
    (task.start_date === null || isString(task.start_date)) &&
    (task.due_date === null || isString(task.due_date)) &&
    (task.estimated_minutes === null || isNumber(task.estimated_minutes)) &&
    (task.category_id === null || isString(task.category_id))
  )
}

/**
 * Google Calendar設定の型ガード
 */
export function isGoogleCalendarConfig(value: unknown): value is GoogleCalendarConfig {
  if (!isObject(value)) return false

  const config = value as Record<string, unknown>
  
  return (
    isBoolean(config.enabled) &&
    isArray(config.selected_calendars) &&
    isString(config.sync_frequency) &&
    ['manual', '5min', '15min', '30min', '1hour'].includes(config.sync_frequency as string) &&
    isString(config.sync_direction) &&
    ['both', 'gcal_to_taskshoot', 'taskshoot_to_gcal'].includes(config.sync_direction as string) &&
    isBoolean(config.auto_sync_enabled) &&
    isString(config.sync_status) &&
    ['idle', 'syncing', 'error', 'success'].includes(config.sync_status as string)
  )
}

/**
 * CalendarListEntryの型ガード
 */
export function isCalendarListEntry(value: unknown): value is CalendarListEntry {
  if (!isObject(value)) return false

  const entry = value as Record<string, unknown>
  
  return (
    (entry.id === undefined || isString(entry.id)) &&
    (entry.summary === undefined || isString(entry.summary)) &&
    (entry.description === undefined || isString(entry.description)) &&
    (entry.primary === undefined || isBoolean(entry.primary)) &&
    (entry.accessRole === undefined || isString(entry.accessRole))
  )
}

/**
 * 日付文字列の型ガード（ISO形式）
 */
export function isISODateString(value: unknown): value is string {
  if (!isString(value)) return false
  
  const date = new Date(value)
  return !isNaN(date.getTime()) && date.toISOString() === value
}

/**
 * UUIDの型ガード
 */
export function isUUID(value: unknown): value is string {
  if (!isString(value)) return false
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Emailの型ガード
 */
export function isEmail(value: unknown): value is string {
  if (!isString(value)) return false
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

/**
 * URLの型ガード
 */
export function isValidURL(value: unknown): value is string {
  if (!isString(value)) return false
  
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/**
 * 正の整数の型ガード
 */
export function isPositiveInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value > 0
}

/**
 * 非負整数の型ガード
 */
export function isNonNegativeInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value >= 0
}

/**
 * 範囲内の数値の型ガード
 */
export function isNumberInRange(min: number, max: number) {
  return function(value: unknown): value is number {
    return isNumber(value) && value >= min && value <= max
  }
}

/**
 * 文字列長制限の型ガード
 */
export function isStringWithMaxLength(maxLength: number) {
  return function(value: unknown): value is string {
    return isString(value) && value.length <= maxLength
  }
}

/**
 * 配列長制限の型ガード
 */
export function isArrayWithMaxLength<T>(maxLength: number, itemGuard: (item: unknown) => item is T) {
  return function(value: unknown): value is T[] {
    if (!isArray(value) || value.length > maxLength) return false
    return value.every(item => itemGuard(item))
  }
}

/**
 * オプショナルな値の型ガード
 */
export function isOptional<T>(guard: (value: unknown) => value is T) {
  return function(value: unknown): value is T | undefined | null {
    return value === undefined || value === null || guard(value)
  }
}

/**
 * カスタム型ガードの組み合わせ
 */
export function satisfiesAll<T>(...guards: Array<(value: unknown) => value is T>) {
  return function(value: unknown): value is T {
    return guards.every(guard => guard(value))
  }
}

/**
 * カスタム型ガードのいずれかを満たす
 */
export function satisfiesAny<T>(...guards: Array<(value: unknown) => value is T>) {
  return function(value: unknown): value is T {
    return guards.some(guard => guard(value))
  }
}

/**
 * リクエストボディの型安全な解析
 */
export async function safeParseRequestBody<T>(
  request: Request,
  guard: (value: unknown) => value is T
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const text = await request.text()
    
    if (!text.trim()) {
      return { success: false, error: 'Empty request body' }
    }

    const parsed = JSON.parse(text)
    
    if (guard(parsed)) {
      return { success: true, data: parsed }
    } else {
      return { success: false, error: 'Invalid request body format' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to parse request body' 
    }
  }
}