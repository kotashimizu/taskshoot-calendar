/**
 * タスク関連のバリデーションスキーマ
 * Zodによる型安全なバリデーション
 */

import { z } from 'zod'
import { TASK_CONSTRAINTS, CATEGORY_CONSTRAINTS } from '@/types/tasks'

// 基本的なバリデーションルール
const uuidSchema = z.string().uuid('無効なUUID形式です')
const dateSchema = z.string().datetime('無効な日時形式です').optional()

// Task Status と Priority の列挙型
const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled'])
const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

// タスク作成スキーマ
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'タスクのタイトルは必須です')
    .max(TASK_CONSTRAINTS.TITLE_MAX_LENGTH, `タイトルは${TASK_CONSTRAINTS.TITLE_MAX_LENGTH}文字以内で入力してください`)
    .trim(),
    
  description: z
    .string()
    .max(TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH, `説明は${TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}文字以内で入力してください`)
    .optional(),
    
  category_id: uuidSchema.optional(),
  
  status: taskStatusSchema.default('pending'),
  
  priority: taskPrioritySchema.default('medium'),
  
  due_date: dateSchema,
  
  start_date: dateSchema,
  
  estimated_minutes: z
    .number()
    .int('見積もり時間は整数で入力してください')
    .min(0, '見積もり時間は0以上で入力してください')
    .max(10080, '見積もり時間は1週間（10080分）以内で入力してください') // 7日 × 24時間 × 60分
    .default(0),
    
  tags: z
    .array(z.string().max(TASK_CONSTRAINTS.TAG_MAX_LENGTH, `タグは${TASK_CONSTRAINTS.TAG_MAX_LENGTH}文字以内で入力してください`))
    .max(TASK_CONSTRAINTS.TAGS_MAX_COUNT, `タグは${TASK_CONSTRAINTS.TAGS_MAX_COUNT}個以内で設定してください`)
    .default([]),
    
  notes: z
    .string()
    .max(TASK_CONSTRAINTS.NOTES_MAX_LENGTH, `メモは${TASK_CONSTRAINTS.NOTES_MAX_LENGTH}文字以内で入力してください`)
    .optional(),
    
  is_recurring: z.boolean().default(false),
  
  recurrence_pattern: z.object({
    type: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().int().min(1).max(365),
    days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
    day_of_month: z.number().int().min(1).max(31).optional(),
    end_date: dateSchema,
    occurrences: z.number().int().min(1).max(1000).optional(),
  }).optional(),
})

// タスク更新スキーマ（すべてのフィールドがオプショナル）
export const updateTaskSchema = createTaskSchema.partial().extend({
  completed_at: dateSchema,
  actual_minutes: z
    .number()
    .int('実際の時間は整数で入力してください')
    .min(0, '実際の時間は0以上で入力してください')
    .max(10080, '実際の時間は1週間（10080分）以内で入力してください')
    .optional(),
})

// カテゴリ作成スキーマ
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'カテゴリ名は必須です')
    .max(CATEGORY_CONSTRAINTS.NAME_MAX_LENGTH, `カテゴリ名は${CATEGORY_CONSTRAINTS.NAME_MAX_LENGTH}文字以内で入力してください`)
    .trim(),
    
  description: z
    .string()
    .max(CATEGORY_CONSTRAINTS.DESCRIPTION_MAX_LENGTH, `説明は${CATEGORY_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}文字以内で入力してください`)
    .optional(),
    
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '色は有効なHEXカラーコード（例: #FF0000）で入力してください')
    .default('#3B82F6'),
    
  icon: z
    .string()
    .max(10, 'アイコンは10文字以内で入力してください')
    .optional(),
    
  sort_order: z
    .number()
    .int('ソート順は整数で入力してください')
    .min(0, 'ソート順は0以上で入力してください')
    .default(0),
})

// カテゴリ更新スキーマ
export const updateCategorySchema = createCategorySchema.partial()

// タスクフィルタースキーマ
export const taskFiltersSchema = z.object({
  status: z.array(taskStatusSchema).optional(),
  priority: z.array(taskPrioritySchema).optional(),
  category_id: z.array(uuidSchema).optional(),
  due_date_from: dateSchema,
  due_date_to: dateSchema,
  search: z.string().max(100, '検索キーワードは100文字以内で入力してください').optional(),
})

// ソートオプションスキーマ
export const taskSortSchema = z.object({
  field: z.enum(['title', 'created_at', 'updated_at', 'due_date', 'priority', 'status']).default('created_at'),
  direction: z.enum(['asc', 'desc']).default('desc'),
})

// ページネーションスキーマ
export const paginationSchema = z.object({
  limit: z
    .number()
    .int('制限数は整数で入力してください')
    .min(1, '制限数は1以上で入力してください')
    .max(100, '制限数は100以下で入力してください')
    .optional(),
    
  offset: z
    .number()
    .int('オフセットは整数で入力してください')
    .min(0, 'オフセットは0以上で入力してください')
    .optional(),
})

// 型エクスポート
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type TaskFiltersInput = z.infer<typeof taskFiltersSchema>
export type TaskSortInput = z.infer<typeof taskSortSchema>
export type PaginationInput = z.infer<typeof paginationSchema>

// バリデーション関数
export function validateCreateTask(data: unknown): CreateTaskInput {
  return createTaskSchema.parse(data)
}

export function validateUpdateTask(data: unknown): UpdateTaskInput {
  return updateTaskSchema.parse(data)
}

export function validateCreateCategory(data: unknown): CreateCategoryInput {
  return createCategorySchema.parse(data)
}

export function validateUpdateCategory(data: unknown): UpdateCategoryInput {
  return updateCategorySchema.parse(data)
}

export function validateTaskFilters(data: unknown): TaskFiltersInput {
  return taskFiltersSchema.parse(data)
}

export function validateTaskSort(data: unknown): TaskSortInput {
  return taskSortSchema.parse(data)
}

export function validatePagination(data: unknown): PaginationInput {
  return paginationSchema.parse(data)
}

// エラーメッセージの日本語化
export function formatValidationError(error: z.ZodError): string {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ')
}