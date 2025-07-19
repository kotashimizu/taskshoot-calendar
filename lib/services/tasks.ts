/**
 * シンプルなタスクサービス
 * 要件定義に基づく実用的な実装
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type {
  Task,
  TaskInsert,
  TaskUpdate,
  TaskWithCategory,
  TaskFilters,
  TaskSortOptions,
  TaskStats,
  Category,
  CategoryInsert,
  CategoryUpdate
} from '@/types/tasks'

/**
 * タスク管理サービス
 */
export class TaskService {
  /**
   * タスク一覧を取得
   */
  async getTasks(
    userId: string,
    filters?: TaskFilters,
    sort?: TaskSortOptions,
    limit?: number,
    offset?: number
  ): Promise<TaskWithCategory[]> {
    try {
      logger.debug('Getting tasks', { userId, filters, sort, limit, offset })

      const supabase = createClient()
      let query = supabase
        .from('tasks')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', userId)

      // フィルタリング
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          query = query.in('status', filters.status)
        }
        if (filters.priority && filters.priority.length > 0) {
          query = query.in('priority', filters.priority)
        }
        if (filters.category_id && filters.category_id.length > 0) {
          query = query.in('category_id', filters.category_id)
        }
        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }
        // 日付フィルターは必要に応じて後で追加
      }

      // ソート
      if (sort) {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      // ページネーション
      if (limit) {
        const start = offset || 0
        query = query.range(start, start + limit - 1)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error('Failed to get tasks', { error, userId })
      throw new Error('タスクの取得に失敗しました')
    }
  }

  /**
   * タスクを作成
   */
  async createTask(userId: string, taskData: TaskInsert): Promise<Task> {
    try {
      logger.debug('Creating task', { userId, taskData })

      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          user_id: userId
        })
        .select()
        .single()

      if (error) throw error

      logger.info('Task created successfully', { taskId: data.id, title: data.title })
      return data
    } catch (error) {
      logger.error('Failed to create task', { error, userId, taskData })
      throw new Error('タスクの作成に失敗しました')
    }
  }

  /**
   * タスクを更新
   */
  async updateTask(userId: string, taskId: string, updates: TaskUpdate): Promise<Task> {
    try {
      logger.debug('Updating task', { userId, taskId, updates })

      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      logger.info('Task updated successfully', { taskId: data.id })
      return data
    } catch (error) {
      logger.error('Failed to update task', { error, userId, taskId })
      throw new Error('タスクの更新に失敗しました')
    }
  }

  /**
   * タスクを削除
   */
  async deleteTask(userId: string, taskId: string): Promise<void> {
    try {
      logger.debug('Deleting task', { userId, taskId })

      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId)

      if (error) throw error

      logger.info('Task deleted successfully', { taskId })
    } catch (error) {
      logger.error('Failed to delete task', { error, userId, taskId })
      throw new Error('タスクの削除に失敗しました')
    }
  }

  /**
   * タスクを取得
   */
  async getTask(userId: string, taskId: string): Promise<TaskWithCategory | null> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('id', taskId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data || null
    } catch (error) {
      logger.error('Failed to get task', { error, userId, taskId })
      return null
    }
  }

  /**
   * タスクをIDで取得（後方互換性）
   */
  async getTaskById(userId: string, taskId: string): Promise<TaskWithCategory | null> {
    return this.getTask(userId, taskId)
  }

  /**
   * タスク統計を取得
   */
  async getTaskStats(userId: string): Promise<TaskStats> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .select('status, priority')
        .eq('user_id', userId)

      if (error) throw error

      const tasks = data || []
      
      const total = tasks.length
      const completed = tasks.filter(t => t.status === 'completed').length
      const inProgress = tasks.filter(t => t.status === 'in_progress').length
      const pending = tasks.filter(t => t.status === 'pending').length
      
      return {
        total_tasks: total,
        completed_tasks: completed,
        pending_tasks: pending,
        in_progress_tasks: inProgress,
        overdue_tasks: 0, // TODO: 実装
        completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    } catch (error) {
      logger.error('Failed to get task stats', { error, userId })
      return {
        total_tasks: 0,
        completed_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        overdue_tasks: 0,
        completion_rate: 0
      }
    }
  }

  /**
   * カテゴリ一覧を取得
   */
  async getCategories(userId: string): Promise<Category[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name')

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error('Failed to get categories', { error, userId })
      return []
    }
  }

  /**
   * カテゴリを作成
   */
  async createCategory(userId: string, categoryData: CategoryInsert): Promise<Category> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories')
        .insert({
          ...categoryData,
          user_id: userId
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      logger.error('Failed to create category', { error, userId, categoryData })
      throw new Error('カテゴリの作成に失敗しました')
    }
  }

  /**
   * カテゴリを更新
   */
  async updateCategory(userId: string, categoryId: string, updates: CategoryUpdate): Promise<Category> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      logger.error('Failed to update category', { error, userId, categoryId })
      throw new Error('カテゴリの更新に失敗しました')
    }
  }

  /**
   * カテゴリを削除
   */
  async deleteCategory(userId: string, categoryId: string): Promise<void> {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      logger.error('Failed to delete category', { error, userId, categoryId })
      throw new Error('カテゴリの削除に失敗しました')
    }
  }
}

// シングルトンインスタンス
export const taskService = new TaskService()

// レガシー関数（後方互換性のため）
export async function getUserTasks(userId: string): Promise<TaskWithCategory[]> {
  return taskService.getTasks(userId)
}

export async function createUserTask(userId: string, taskData: TaskInsert): Promise<Task> {
  return taskService.createTask(userId, taskData)
}

export async function updateUserTask(userId: string, taskId: string, updates: TaskUpdate): Promise<Task> {
  return taskService.updateTask(userId, taskId, updates)
}

export async function deleteUserTask(userId: string, taskId: string): Promise<void> {
  return taskService.deleteTask(userId, taskId)
}