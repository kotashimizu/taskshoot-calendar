/**
 * リポジトリパターン実装
 * データアクセス層の抽象化とテスタビリティの向上
 */

import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import {
  Task,
  TaskWithCategory,
  TaskInsert,
  TaskUpdate,
  TaskFilters,
  TaskSortOptions,
  TaskStats,
  Category,
  CategoryInsert,
  CategoryUpdate,
} from '@/types/tasks'
import { GoogleCalendarConfig } from '@/types/google-calendar'

// 基底リポジトリインターフェース
export interface Repository<T, TKey = string> {
  findById(id: TKey): Promise<T | null>
  findAll(): Promise<T[]>
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>
  update(id: TKey, updates: Partial<T>): Promise<T>
  delete(id: TKey): Promise<void>
}

// ユーザースコープ付きリポジトリインターフェース
export interface UserScopedRepository<T, TKey = string> extends Repository<T, TKey> {
  findByUserId(userId: string): Promise<T[]>
  findByUserIdAndId(userId: string, id: TKey): Promise<T | null>
  createForUser(userId: string, entity: any): Promise<T>
  updateForUser(userId: string, id: TKey, updates: Partial<T>): Promise<T>
  deleteForUser(userId: string, id: TKey): Promise<void>
}

// タスクリポジトリインターフェース
export interface ITaskRepository extends UserScopedRepository<TaskWithCategory> {
  findByFilters(
    userId: string,
    filters?: TaskFilters,
    sort?: TaskSortOptions,
    limit?: number,
    offset?: number
  ): Promise<TaskWithCategory[]>
  getStats(userId: string): Promise<TaskStats>
  bulkUpdate(userId: string, taskIds: string[], updates: Partial<TaskUpdate>): Promise<void>
  findOverdue(userId: string): Promise<TaskWithCategory[]>
  findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<TaskWithCategory[]>
}

// カテゴリリポジトリインターフェース
export interface ICategoryRepository extends UserScopedRepository<Category> {
  findActiveByUserId(userId: string): Promise<Category[]>
  softDelete(userId: string, id: string): Promise<void>
  updateSortOrder(userId: string, categoryOrders: Array<{ id: string; sort_order: number }>): Promise<void>
}

// Google Calendarリポジトリインターフェース
export interface IGoogleCalendarRepository extends UserScopedRepository<GoogleCalendarConfig> {
  findEnabledByUserId(userId: string): Promise<GoogleCalendarConfig | null>
  updateTokens(userId: string, accessToken: string, refreshToken?: string): Promise<void>
  disableSync(userId: string): Promise<void>
}

// 作業単位パターン（Unit of Work）
export interface IUnitOfWork {
  tasks: ITaskRepository
  categories: ICategoryRepository
  googleCalendar: IGoogleCalendarRepository
  beginTransaction(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  dispose(): Promise<void>
}

// タスクリポジトリ実装
export class TaskRepository implements ITaskRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<TaskWithCategory | null> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      logger.error('TaskRepository.findById failed', { id, error })
      throw error
    }
  }

  async findAll(): Promise<TaskWithCategory[]> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select(`
          *,
          category:categories(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('TaskRepository.findAll failed', { error })
      throw error
    }
  }

  async findByUserId(userId: string): Promise<TaskWithCategory[]> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('TaskRepository.findByUserId failed', { userId, error })
      throw error
    }
  }

  async findByUserIdAndId(userId: string, id: string): Promise<TaskWithCategory | null> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', userId)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      logger.error('TaskRepository.findByUserIdAndId failed', { userId, id, error })
      throw error
    }
  }

  async findByFilters(
    userId: string,
    filters?: TaskFilters,
    sort?: TaskSortOptions,
    limit?: number,
    offset?: number
  ): Promise<TaskWithCategory[]> {
    try {
      let query = this.supabase
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

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('TaskRepository.findByFilters failed', { userId, filters, error })
      throw error
    }
  }

  async create(entity: Omit<TaskWithCategory, 'id' | 'created_at' | 'updated_at'>): Promise<TaskWithCategory> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .insert(entity)
        .select(`
          *,
          category:categories(*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('TaskRepository.create failed', { entity, error })
      throw error
    }
  }

  async createForUser(userId: string, entity: Omit<TaskInsert, 'user_id'>): Promise<TaskWithCategory> {
    return this.create({ ...entity, user_id: userId } as any)
  }

  async update(id: string, updates: Partial<TaskWithCategory>): Promise<TaskWithCategory> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          category:categories(*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('TaskRepository.update failed', { id, updates, error })
      throw error
    }
  }

  async updateForUser(userId: string, id: string, updates: Partial<TaskWithCategory>): Promise<TaskWithCategory> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .update(updates)
        .eq('user_id', userId)
        .eq('id', id)
        .select(`
          *,
          category:categories(*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('TaskRepository.updateForUser failed', { userId, id, updates, error })
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      logger.error('TaskRepository.delete failed', { id, error })
      throw error
    }
  }

  async deleteForUser(userId: string, id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tasks')
        .delete()
        .eq('user_id', userId)
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      logger.error('TaskRepository.deleteForUser failed', { userId, id, error })
      throw error
    }
  }

  async getStats(userId: string): Promise<TaskStats> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_task_stats', { p_user_id: userId })

      if (error) throw error

      return data[0] || {
        total_tasks: 0,
        completed_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        overdue_tasks: 0,
        completion_rate: 0,
      }
    } catch (error) {
      logger.error('TaskRepository.getStats failed', { userId, error })
      throw error
    }
  }

  async bulkUpdate(userId: string, taskIds: string[], updates: Partial<TaskUpdate>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tasks')
        .update(updates)
        .eq('user_id', userId)
        .in('id', taskIds)

      if (error) throw error
    } catch (error) {
      logger.error('TaskRepository.bulkUpdate failed', { userId, taskIds, updates, error })
      throw error
    }
  }

  async findOverdue(userId: string): Promise<TaskWithCategory[]> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', userId)
        .neq('status', 'completed')
        .lt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('TaskRepository.findOverdue failed', { userId, error })
      throw error
    }
  }

  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<TaskWithCategory[]> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', userId)
        .gte('due_date', startDate.toISOString())
        .lte('due_date', endDate.toISOString())
        .order('due_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('TaskRepository.findByDateRange failed', { userId, startDate, endDate, error })
      throw error
    }
  }
}

// カテゴリリポジトリ実装
export class CategoryRepository implements ICategoryRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<Category | null> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      logger.error('CategoryRepository.findById failed', { id, error })
      throw error
    }
  }

  async findAll(): Promise<Category[]> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('CategoryRepository.findAll failed', { error })
      throw error
    }
  }

  async findByUserId(userId: string): Promise<Category[]> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('CategoryRepository.findByUserId failed', { userId, error })
      throw error
    }
  }

  async findActiveByUserId(userId: string): Promise<Category[]> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('CategoryRepository.findActiveByUserId failed', { userId, error })
      throw error
    }
  }

  async findByUserIdAndId(userId: string, id: string): Promise<Category | null> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      logger.error('CategoryRepository.findByUserIdAndId failed', { userId, id, error })
      throw error
    }
  }

  async create(entity: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .insert(entity)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('CategoryRepository.create failed', { entity, error })
      throw error
    }
  }

  async createForUser(userId: string, entity: Omit<CategoryInsert, 'user_id'>): Promise<Category> {
    return this.create({ ...entity, user_id: userId } as any)
  }

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('CategoryRepository.update failed', { id, updates, error })
      throw error
    }
  }

  async updateForUser(userId: string, id: string, updates: Partial<Category>): Promise<Category> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .update(updates)
        .eq('user_id', userId)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('CategoryRepository.updateForUser failed', { userId, id, updates, error })
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      logger.error('CategoryRepository.delete failed', { id, error })
      throw error
    }
  }

  async deleteForUser(userId: string, id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('categories')
        .delete()
        .eq('user_id', userId)
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      logger.error('CategoryRepository.deleteForUser failed', { userId, id, error })
      throw error
    }
  }

  async softDelete(userId: string, id: string): Promise<void> {
    await this.updateForUser(userId, id, { is_active: false })
  }

  async updateSortOrder(userId: string, categoryOrders: Array<{ id: string; sort_order: number }>): Promise<void> {
    try {
      const promises = categoryOrders.map(({ id, sort_order }) =>
        this.updateForUser(userId, id, { sort_order })
      )

      await Promise.all(promises)
    } catch (error) {
      logger.error('CategoryRepository.updateSortOrder failed', { userId, categoryOrders, error })
      throw error
    }
  }
}

// Google Calendarリポジトリ実装
export class GoogleCalendarRepository implements IGoogleCalendarRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<GoogleCalendarConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('google_calendar_configs')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      logger.error('GoogleCalendarRepository.findById failed', { id, error })
      throw error
    }
  }

  async findAll(): Promise<GoogleCalendarConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('google_calendar_configs')
        .select('*')

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('GoogleCalendarRepository.findAll failed', { error })
      throw error
    }
  }

  async findByUserId(userId: string): Promise<GoogleCalendarConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('google_calendar_configs')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('GoogleCalendarRepository.findByUserId failed', { userId, error })
      throw error
    }
  }

  async findByUserIdAndId(userId: string, id: string): Promise<GoogleCalendarConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('google_calendar_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      logger.error('GoogleCalendarRepository.findByUserIdAndId failed', { userId, id, error })
      throw error
    }
  }

  async findEnabledByUserId(userId: string): Promise<GoogleCalendarConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('google_calendar_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      logger.error('GoogleCalendarRepository.findEnabledByUserId failed', { userId, error })
      throw error
    }
  }

  async create(entity: Omit<GoogleCalendarConfig, 'id' | 'created_at' | 'updated_at'>): Promise<GoogleCalendarConfig> {
    try {
      const { data, error } = await this.supabase
        .from('google_calendar_configs')
        .insert(entity)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('GoogleCalendarRepository.create failed', { entity, error })
      throw error
    }
  }

  async createForUser(userId: string, entity: any): Promise<GoogleCalendarConfig> {
    return this.create({ ...entity, user_id: userId })
  }

  async update(id: string, updates: Partial<GoogleCalendarConfig>): Promise<GoogleCalendarConfig> {
    try {
      const { data, error } = await this.supabase
        .from('google_calendar_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('GoogleCalendarRepository.update failed', { id, updates, error })
      throw error
    }
  }

  async updateForUser(userId: string, id: string, updates: Partial<GoogleCalendarConfig>): Promise<GoogleCalendarConfig> {
    try {
      const { data, error } = await this.supabase
        .from('google_calendar_configs')
        .update(updates)
        .eq('user_id', userId)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('GoogleCalendarRepository.updateForUser failed', { userId, id, updates, error })
      throw error
    }
  }

  async updateTokens(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    try {
      const updates: any = {
        access_token: accessToken,
        updated_at: new Date().toISOString(),
      }

      if (refreshToken) {
        updates.refresh_token = refreshToken
      }

      const { error } = await this.supabase
        .from('google_calendar_configs')
        .update(updates)
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      logger.error('GoogleCalendarRepository.updateTokens failed', { userId, error })
      throw error
    }
  }

  async disableSync(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('google_calendar_configs')
        .update({
          enabled: false,
          access_token: null,
          refresh_token: null,
          sync_status: 'idle',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      logger.error('GoogleCalendarRepository.disableSync failed', { userId, error })
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('google_calendar_configs')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      logger.error('GoogleCalendarRepository.delete failed', { id, error })
      throw error
    }
  }

  async deleteForUser(userId: string, id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('google_calendar_configs')
        .delete()
        .eq('user_id', userId)
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      logger.error('GoogleCalendarRepository.deleteForUser failed', { userId, id, error })
      throw error
    }
  }
}

// 作業単位実装
export class UnitOfWork implements IUnitOfWork {
  public readonly tasks: ITaskRepository
  public readonly categories: ICategoryRepository
  public readonly googleCalendar: IGoogleCalendarRepository

  private isTransactionActive = false

  constructor(private supabase: SupabaseClient) {
    this.tasks = new TaskRepository(supabase)
    this.categories = new CategoryRepository(supabase)
    this.googleCalendar = new GoogleCalendarRepository(supabase)
  }

  async beginTransaction(): Promise<void> {
    if (this.isTransactionActive) {
      throw new Error('Transaction is already active')
    }

    try {
      // Supabaseではトランザクションを直接サポートしていないため、
      // ここではフラグ管理のみ（将来的にはPostgreSQLトランザクションを直接使用可能）
      this.isTransactionActive = true
      logger.debug('Transaction started')
    } catch (error) {
      logger.error('Failed to begin transaction', error)
      throw error
    }
  }

  async commit(): Promise<void> {
    if (!this.isTransactionActive) {
      throw new Error('No active transaction to commit')
    }

    try {
      // 実際のコミット処理はSupabaseが自動で行う
      this.isTransactionActive = false
      logger.debug('Transaction committed')
    } catch (error) {
      logger.error('Failed to commit transaction', error)
      throw error
    }
  }

  async rollback(): Promise<void> {
    if (!this.isTransactionActive) {
      throw new Error('No active transaction to rollback')
    }

    try {
      // ロールバック処理（実装は環境に依存）
      this.isTransactionActive = false
      logger.debug('Transaction rolled back')
    } catch (error) {
      logger.error('Failed to rollback transaction', error)
      throw error
    }
  }

  async dispose(): Promise<void> {
    if (this.isTransactionActive) {
      await this.rollback()
    }
    logger.debug('UnitOfWork disposed')
  }
}

// ファクトリー関数
export function createUnitOfWork(): IUnitOfWork {
  const supabase = createClient()
  return new UnitOfWork(supabase)
}

export function createTaskRepository(): ITaskRepository {
  const supabase = createClient()
  return new TaskRepository(supabase)
}

export function createCategoryRepository(): ICategoryRepository {
  const supabase = createClient()
  return new CategoryRepository(supabase)
}

export function createGoogleCalendarRepository(): IGoogleCalendarRepository {
  const supabase = createClient()
  return new GoogleCalendarRepository(supabase)
}