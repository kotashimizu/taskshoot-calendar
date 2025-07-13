/**
 * レガシータスクサービス（後方互換性のため）
 * 新しいアーキテクチャへの移行期間中のアダプター
 * 
 * @deprecated 新しいアーキテクチャのTaskServiceを使用してください
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  Task,
  TaskInsert,
  TaskUpdate,
  TaskWithCategory,
  TaskFilters,
  TaskSortOptions,
  TaskStats,
  Category,
  CategoryInsert,
  CategoryUpdate,
  TASK_CONSTRAINTS,
  CATEGORY_CONSTRAINTS
} from '@/types/tasks'
import { 
  SERVICE_TOKENS,
  withServiceScope 
} from '@/lib/architecture/services'
import { 
  publishTaskCreated, 
  publishTaskUpdated, 
  publishTaskDeleted 
} from '@/lib/architecture/events'

/**
 * @deprecated レガシータスクサービス
 * 新しいアーキテクチャのサービスに移行してください
 */
export class LegacyTaskService {
  private getSupabase() {
    return createClient()
  }

  // タスク関連のメソッド
  async getTasks(
    userId: string,
    filters?: TaskFilters,
    sort?: TaskSortOptions,
    limit?: number,
    offset?: number
  ): Promise<TaskWithCategory[]> {
    try {
      const supabase = this.getSupabase()
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
        if (filters.due_date_from) {
          query = query.gte('due_date', filters.due_date_from)
        }
        if (filters.due_date_to) {
          query = query.lte('due_date', filters.due_date_to)
        }
        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }
      }

      // ソート
      if (sort) {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      // ページネーション
      if (limit) {
        query = query.limit(limit)
      }
      if (offset) {
        query = query.range(offset, offset + (limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        logger.error('Failed to fetch tasks', error)
        throw new Error('タスクの取得に失敗しました')
      }

      return data || []
    } catch (error) {
      logger.error('Error in getTasks', error)
      throw error
    }
  }

  async getTaskById(userId: string, taskId: string): Promise<TaskWithCategory | null> {
    try {
      const supabase = this.getSupabase()
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', userId)
        .eq('id', taskId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // タスクが見つからない
        }
        logger.error('Failed to fetch task by ID', error)
        throw new Error('タスクの取得に失敗しました')
      }

      return data
    } catch (error) {
      logger.error('Error in getTaskById', error)
      throw error
    }
  }

  async createTask(userId: string, taskData: Omit<TaskInsert, 'user_id'>): Promise<Task> {
    try {
      // バリデーション
      this.validateTaskData(taskData)

      const supabase = this.getSupabase()
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          user_id: userId,
        })
        .select()
        .single()

      if (error) {
        logger.error('Failed to create task', error)
        throw new Error('タスクの作成に失敗しました')
      }

      logger.info('Task created successfully', { taskId: data.id, userId })
      
      // 新しいアーキテクチャのイベント発行
      try {
        await publishTaskCreated(data as TaskWithCategory, userId)
      } catch (eventError) {
        logger.warn('Failed to publish task created event', { taskId: data.id, eventError })
      }
      
      return data
    } catch (error) {
      logger.error('Error in createTask', error)
      throw error
    }
  }

  async updateTask(
    userId: string,
    taskId: string,
    updates: Omit<TaskUpdate, 'user_id' | 'id'>
  ): Promise<Task> {
    try {
      // バリデーション
      this.validateTaskData(updates)

      // 完了状態の変更時に completed_at を自動設定
      if (updates.status === 'completed') {
        updates.completed_at = new Date().toISOString()
      } else if (updates.status) {
        updates.completed_at = null
      }

      const supabase = this.getSupabase()
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('user_id', userId)
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        logger.error('Failed to update task', error)
        throw new Error('タスクの更新に失敗しました')
      }

      logger.info('Task updated successfully', { taskId, userId })
      
      // 新しいアーキテクチャのイベント発行
      try {
        // 前の状態を取得するため、ここでは簡略化
        await publishTaskUpdated(data as TaskWithCategory, data as TaskWithCategory, userId)
      } catch (eventError) {
        logger.warn('Failed to publish task updated event', { taskId, eventError })
      }
      
      return data
    } catch (error) {
      logger.error('Error in updateTask', error)
      throw error
    }
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    try {
      const supabase = this.getSupabase()
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', userId)
        .eq('id', taskId)

      if (error) {
        logger.error('Failed to delete task', error)
        throw new Error('タスクの削除に失敗しました')
      }

      logger.info('Task deleted successfully', { taskId, userId })
      
      // 新しいアーキテクチャのイベント発行
      try {
        // 削除前のタスクデータが必要だが、既に削除されているため
        // 実際の実装では削除前に取得する必要がある
        await publishTaskDeleted(taskId, {} as TaskWithCategory, userId)
      } catch (eventError) {
        logger.warn('Failed to publish task deleted event', { taskId, eventError })
      }
    } catch (error) {
      logger.error('Error in deleteTask', error)
      throw error
    }
  }

  async getTaskStats(userId: string): Promise<TaskStats> {
    try {
      const supabase = this.getSupabase()
      const { data, error } = await supabase
        .rpc('get_task_stats', { p_user_id: userId })

      if (error) {
        logger.error('Failed to get task stats', error)
        throw new Error('タスク統計の取得に失敗しました')
      }

      return data[0] || {
        total_tasks: 0,
        completed_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        overdue_tasks: 0,
        completion_rate: 0,
      }
    } catch (error) {
      logger.error('Error in getTaskStats', error)
      throw error
    }
  }

  // カテゴリ関連のメソッド
  async getCategories(userId: string): Promise<Category[]> {
    try {
      const supabase = this.getSupabase()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) {
        logger.error('Failed to fetch categories', error)
        throw new Error('カテゴリの取得に失敗しました')
      }

      return data || []
    } catch (error) {
      logger.error('Error in getCategories', error)
      throw error
    }
  }

  async createCategory(
    userId: string,
    categoryData: Omit<CategoryInsert, 'user_id'>
  ): Promise<Category> {
    try {
      // バリデーション
      this.validateCategoryData(categoryData)

      const supabase = this.getSupabase()
      const { data, error } = await supabase
        .from('categories')
        .insert({
          ...categoryData,
          user_id: userId,
        })
        .select()
        .single()

      if (error) {
        logger.error('Failed to create category', error)
        throw new Error('カテゴリの作成に失敗しました')
      }

      logger.info('Category created successfully', { categoryId: data.id, userId })
      return data
    } catch (error) {
      logger.error('Error in createCategory', error)
      throw error
    }
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    updates: Omit<CategoryUpdate, 'user_id' | 'id'>
  ): Promise<Category> {
    try {
      // バリデーション
      this.validateCategoryData(updates)

      const supabase = this.getSupabase()
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('user_id', userId)
        .eq('id', categoryId)
        .select()
        .single()

      if (error) {
        logger.error('Failed to update category', error)
        throw new Error('カテゴリの更新に失敗しました')
      }

      logger.info('Category updated successfully', { categoryId, userId })
      return data
    } catch (error) {
      logger.error('Error in updateCategory', error)
      throw error
    }
  }

  async deleteCategory(userId: string, categoryId: string): Promise<void> {
    try {
      const supabase = this.getSupabase()
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', userId)
        .eq('id', categoryId)

      if (error) {
        logger.error('Failed to delete category', error)
        throw new Error('カテゴリの削除に失敗しました')
      }

      logger.info('Category deleted successfully', { categoryId, userId })
    } catch (error) {
      logger.error('Error in deleteCategory', error)
      throw error
    }
  }

  // バリデーション メソッド
  private validateTaskData(data: Partial<TaskInsert | TaskUpdate>): void {
    if (data.title !== undefined) {
      if (!data.title.trim()) {
        throw new Error('タスクのタイトルは必須です')
      }
      if (data.title.length > TASK_CONSTRAINTS.TITLE_MAX_LENGTH) {
        throw new Error(`タスクのタイトルは${TASK_CONSTRAINTS.TITLE_MAX_LENGTH}文字以内で入力してください`)
      }
    }

    if (data.description !== undefined && data.description && data.description.length > TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
      throw new Error(`タスクの説明は${TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}文字以内で入力してください`)
    }

    if (data.notes !== undefined && data.notes && data.notes.length > TASK_CONSTRAINTS.NOTES_MAX_LENGTH) {
      throw new Error(`タスクのメモは${TASK_CONSTRAINTS.NOTES_MAX_LENGTH}文字以内で入力してください`)
    }

    if (data.tags !== undefined && data.tags) {
      if (data.tags.length > TASK_CONSTRAINTS.TAGS_MAX_COUNT) {
        throw new Error(`タグは${TASK_CONSTRAINTS.TAGS_MAX_COUNT}個以内で設定してください`)
      }
      for (const tag of data.tags) {
        if (tag.length > TASK_CONSTRAINTS.TAG_MAX_LENGTH) {
          throw new Error(`タグは${TASK_CONSTRAINTS.TAG_MAX_LENGTH}文字以内で入力してください`)
        }
      }
    }

    if (data.estimated_minutes !== undefined && data.estimated_minutes < 0) {
      throw new Error('見積もり時間は0以上で入力してください')
    }

    if (data.actual_minutes !== undefined && data.actual_minutes < 0) {
      throw new Error('実際の時間は0以上で入力してください')
    }
  }

  private validateCategoryData(data: Partial<CategoryInsert | CategoryUpdate>): void {
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new Error('カテゴリ名は必須です')
      }
      if (data.name.length > CATEGORY_CONSTRAINTS.NAME_MAX_LENGTH) {
        throw new Error(`カテゴリ名は${CATEGORY_CONSTRAINTS.NAME_MAX_LENGTH}文字以内で入力してください`)
      }
    }

    if (data.description !== undefined && data.description && data.description.length > CATEGORY_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
      throw new Error(`カテゴリの説明は${CATEGORY_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}文字以内で入力してください`)
    }
  }
}

// レガシーサポート用のシングルトンインスタンス
// @deprecated 新しいアーキテクチャのサービスを使用してください
export const taskService = new LegacyTaskService()

/**
 * 新しいアーキテクチャ対応のタスクサービス統合ラッパー
 * 依存性注入コンテナから適切なサービスを取得
 */
export class TaskServiceFacade {
  async getTasks(
    userId: string,
    filters?: TaskFilters,
    sort?: TaskSortOptions,
    limit?: number,
    offset?: number
  ): Promise<TaskWithCategory[]> {
    return withServiceScope(async (scope) => {
      const taskService = await scope.get(SERVICE_TOKENS.TASK_SERVICE)
      // TODO: 新しいアーキテクチャのメソッドを呼び出し
      // 現在はレガシーサービスにフォールバック
      return this.legacyTaskService.getTasks(userId, filters, sort, limit, offset)
    })
  }

  async createTask(userId: string, taskData: Omit<TaskInsert, 'user_id'>): Promise<Task> {
    return withServiceScope(async (scope) => {
      const taskService = await scope.get(SERVICE_TOKENS.TASK_SERVICE)
      return taskService.createTask(userId, taskData)
    })
  }

  async updateTask(
    userId: string,
    taskId: string,
    updates: Omit<TaskUpdate, 'user_id' | 'id'>
  ): Promise<Task> {
    return withServiceScope(async (scope) => {
      const taskService = await scope.get(SERVICE_TOKENS.TASK_SERVICE)
      return taskService.updateTask(userId, taskId, updates)
    })
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    return withServiceScope(async (scope) => {
      const taskService = await scope.get(SERVICE_TOKENS.TASK_SERVICE)
      return taskService.deleteTask(userId, taskId)
    })
  }

  private get legacyTaskService() {
    return taskService
  }
}

// 新しいアーキテクチャ対応のインスタンス
export const modernTaskService = new TaskServiceFacade()