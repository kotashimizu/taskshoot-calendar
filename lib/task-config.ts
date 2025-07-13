/**
 * タスク関連の共通設定
 * 型安全性とコンポーネント間の一貫性を保証
 */

import { 
  Circle, 
  Clock, 
  CheckCircle, 
  LucideIcon 
} from 'lucide-react'
import { TaskStatus, TaskPriority } from '@/types/tasks'

// ステータス設定の型定義
export interface StatusConfig {
  readonly label: string
  readonly icon: LucideIcon
  readonly color: string
  readonly bgColor?: string
  readonly textColor?: string
}

// 優先度設定の型定義
export interface PriorityConfig {
  readonly label: string
  readonly color: string
  readonly bgColor?: string
  readonly textColor?: string
  readonly weight: number // ソート用
}

// ステータス設定（共通）
export const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  pending: {
    label: '未着手',
    icon: Circle,
    color: 'bg-gray-100 text-gray-800',
    bgColor: '#F9FAFB',
    textColor: '#374151',
  },
  in_progress: {
    label: '進行中',
    icon: Clock,
    color: 'bg-blue-100 text-blue-800',
    bgColor: '#EFF6FF',
    textColor: '#1E40AF',
  },
  completed: {
    label: '完了',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
    bgColor: '#ECFDF5',
    textColor: '#065F46',
  },
  cancelled: {
    label: 'キャンセル',
    icon: Circle,
    color: 'bg-red-100 text-red-800',
    bgColor: '#FEF2F2',
    textColor: '#991B1B',
  },
} as const

// 優先度設定（共通）
export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  low: {
    label: '低',
    color: 'bg-gray-100 text-gray-800',
    bgColor: '#F9FAFB',
    textColor: '#374151',
    weight: 1,
  },
  medium: {
    label: '中',
    color: 'bg-yellow-100 text-yellow-800',
    bgColor: '#FFFBEB',
    textColor: '#92400E',
    weight: 2,
  },
  high: {
    label: '高',
    color: 'bg-orange-100 text-orange-800',
    bgColor: '#FFF7ED',
    textColor: '#9A3412',
    weight: 3,
  },
  urgent: {
    label: '緊急',
    color: 'bg-red-100 text-red-800',
    bgColor: '#FEF2F2',
    textColor: '#991B1B',
    weight: 4,
  },
} as const

// ヘルパー関数
export const getStatusConfig = (status: TaskStatus): StatusConfig => {
  return STATUS_CONFIG[status]
}

export const getPriorityConfig = (priority: TaskPriority): PriorityConfig => {
  return PRIORITY_CONFIG[priority]
}

export const formatTaskDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}分`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}時間${remainingMinutes}分` : `${hours}時間`
}

export const isTaskOverdue = (dueDate: string | null | undefined): boolean => {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

// 優先度でタスクをソート
export const sortTasksByPriority = <T extends { priority: TaskPriority }>(tasks: T[]): T[] => {
  return [...tasks].sort((a, b) => 
    getPriorityConfig(b.priority).weight - getPriorityConfig(a.priority).weight
  )
}

// ステータスでタスクをグループ化
export const groupTasksByStatus = <T extends { status: TaskStatus }>(tasks: T[]): Record<TaskStatus, T[]> => {
  const groups: Record<TaskStatus, T[]> = {
    pending: [],
    in_progress: [],
    completed: [],
    cancelled: [],
  }
  
  tasks.forEach(task => {
    groups[task.status].push(task)
  })
  
  return groups
}

// カラーパレット（一貫した色使いのため）
export const TASK_COLORS = {
  priority: {
    low: '#10B981',
    medium: '#F59E0B', 
    high: '#EF4444',
    urgent: '#DC2626',
  },
  status: {
    pending: '#6B7280',
    in_progress: '#3B82F6',
    completed: '#10B981',
    cancelled: '#EF4444',
  },
  background: {
    light: '#F9FAFB',
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
} as const