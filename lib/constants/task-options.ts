import { TaskPriority, TaskStatus, TaskSortOptions } from '@/types/tasks'

export const PRIORITY_OPTIONS = [
  { value: 'low' as TaskPriority, label: '低', icon: '🔵', order: 1 },
  { value: 'medium' as TaskPriority, label: '中', icon: '🟡', order: 2 },
  { value: 'high' as TaskPriority, label: '高', icon: '🟠', order: 3 },
  { value: 'urgent' as TaskPriority, label: '緊急', icon: '🔴', order: 4 },
] as const

export const STATUS_OPTIONS = [
  { value: 'pending' as TaskStatus, label: '未着手', icon: '⏳', order: 1 },
  { value: 'in_progress' as TaskStatus, label: '進行中', icon: '🚀', order: 2 },
  { value: 'completed' as TaskStatus, label: '完了', icon: '✅', order: 3 },
  { value: 'cancelled' as TaskStatus, label: 'キャンセル', icon: '❌', order: 4 },
] as const

export const PRIORITY_FILTER_OPTIONS = [
  { value: 'all', label: 'すべて' },
  ...PRIORITY_OPTIONS,
] as const

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'すべて' },
  ...STATUS_OPTIONS,
] as const

export const SORT_OPTIONS = [
  { value: 'created_at' as TaskSortOptions['field'], label: '作成日時' },
  { value: 'updated_at' as TaskSortOptions['field'], label: '更新日時' },
  { value: 'due_date' as TaskSortOptions['field'], label: '期限' },
  { value: 'priority' as TaskSortOptions['field'], label: '優先度' },
  { value: 'title' as TaskSortOptions['field'], label: 'タスク名' },
] as const

// ヘルパー関数
export const getPriorityOption = (priority: TaskPriority) => 
  PRIORITY_OPTIONS.find(option => option.value === priority)

export const getStatusOption = (status: TaskStatus) => 
  STATUS_OPTIONS.find(option => option.value === status)

export const getPriorityOrder = (priority: TaskPriority): number => 
  getPriorityOption(priority)?.order ?? 0

export const getStatusOrder = (status: TaskStatus): number => 
  getStatusOption(status)?.order ?? 0