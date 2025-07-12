import { Database } from './database'

// Database types
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

// Task status and priority enums
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

// Extended types for UI components
export interface TaskWithCategory extends Task {
  category?: Category | null
}

export interface TaskFormData {
  title: string
  description?: string
  category_id?: string
  priority: TaskPriority
  status: TaskStatus
  due_date?: string
  start_date?: string
  estimated_minutes?: number
  tags?: string[]
  notes?: string
}

export interface CategoryFormData {
  name: string
  description?: string
  color: string
  icon?: string
  sort_order?: number
}

// Task statistics
export interface TaskStats {
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  in_progress_tasks: number
  overdue_tasks: number
  completion_rate: number
}

// Task filters and sorting
export interface TaskFilters {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  category_id?: string[]
  due_date_from?: string
  due_date_to?: string
  search?: string
}

export interface TaskSortOptions {
  field: 'title' | 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'status'
  direction: 'asc' | 'desc'
}

// Recurrence pattern type
export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number // every N days/weeks/months/years
  days_of_week?: number[] // for weekly: 0=Sunday, 1=Monday, etc.
  day_of_month?: number // for monthly
  end_date?: string
  occurrences?: number
}

// Time tracking
export interface TimeEntry {
  id: string
  task_id: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  description?: string
  created_at: string
}

// Task validation
export const TASK_CONSTRAINTS = {
  TITLE_MAX_LENGTH: 500,
  DESCRIPTION_MAX_LENGTH: 5000,
  NOTES_MAX_LENGTH: 2000,
  TAGS_MAX_COUNT: 10,
  TAG_MAX_LENGTH: 50,
} as const

export const CATEGORY_CONSTRAINTS = {
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
} as const

// Task priority colors and labels
export const TASK_PRIORITY_CONFIG = {
  low: {
    label: '低',
    color: '#10B981',
    bgColor: '#ECFDF5',
    textColor: '#065F46',
  },
  medium: {
    label: '中',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    textColor: '#92400E',
  },
  high: {
    label: '高',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    textColor: '#991B1B',
  },
  urgent: {
    label: '緊急',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    textColor: '#7F1D1D',
  },
} as const

// Task status colors and labels
export const TASK_STATUS_CONFIG = {
  pending: {
    label: '未着手',
    color: '#6B7280',
    bgColor: '#F9FAFB',
    textColor: '#374151',
  },
  in_progress: {
    label: '進行中',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    textColor: '#1E40AF',
  },
  completed: {
    label: '完了',
    color: '#10B981',
    bgColor: '#ECFDF5',
    textColor: '#065F46',
  },
  cancelled: {
    label: 'キャンセル',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    textColor: '#991B1B',
  },
} as const

// Default category colors
export const DEFAULT_CATEGORY_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#84CC16', // Lime
  '#6366F1', // Indigo
] as const

// Utility functions for task operations
export const isTaskOverdue = (task: Task): boolean => {
  if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
    return false
  }
  return new Date(task.due_date) < new Date()
}

export const getTaskCompletionRate = (tasks: Task[]): number => {
  if (tasks.length === 0) return 0
  const completedTasks = tasks.filter(task => task.status === 'completed').length
  return Math.round((completedTasks / tasks.length) * 100)
}

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}分`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}時間${remainingMinutes}分` : `${hours}時間`
}