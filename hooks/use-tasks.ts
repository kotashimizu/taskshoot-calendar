'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'
import { demoTaskOperations } from '@/lib/demo-data'
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
  CategoryUpdate
} from '@/types/tasks'

interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
  message?: string
}

interface UseTasksOptions {
  enableCache?: boolean
  refetchInterval?: number
  staleTime?: number
}

const DEFAULT_OPTIONS: UseTasksOptions = {
  enableCache: true,
  refetchInterval: 0,
  staleTime: 5 * 60 * 1000, // 5分
}

// グローバルキャッシュ（簡易実装）
const taskCache = new Map<string, { data: TaskWithCategory[]; timestamp: number }>()
const categoryCache = new Map<string, { data: Category[]; timestamp: number }>()

export function useTasks(
  filters?: TaskFilters, 
  sort?: TaskSortOptions, 
  options: UseTasksOptions = {}
) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<TaskWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const abortControllerRef = useRef<AbortController>()

  // フィルタとソートのメモ化
  const filtersKey = useMemo(() => {
    return JSON.stringify(filters || {})
  }, [filters])

  const sortKey = useMemo(() => {
    return JSON.stringify(sort || { field: 'created_at', direction: 'desc' })
  }, [sort])

  // キャッシュキーの生成
  const cacheKey = useMemo(() => {
    return `tasks:${user?.id}:${filtersKey}:${sortKey}`
  }, [user?.id, filtersKey, sortKey])

  // キャッシュからデータを取得
  const getCachedData = useCallback(() => {
    if (!opts.enableCache || !user) return null
    
    const cached = taskCache.get(cacheKey)
    if (!cached) return null
    
    const isStale = Date.now() - cached.timestamp > opts.staleTime!
    return isStale ? null : cached.data
  }, [cacheKey, opts.enableCache, opts.staleTime, user])

  // キャッシュにデータを保存
  const setCachedData = useCallback((data: TaskWithCategory[]) => {
    if (!opts.enableCache || !user) return
    
    taskCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })
  }, [cacheKey, opts.enableCache, user])

  const fetchTasks = useCallback(async (force = false) => {
    if (!user) return

    // デモモードの場合
    if (user.email === 'demo@taskshoot.com') {
      try {
        setLoading(true)
        setError(null)
        
        const demoTasks = await demoTaskOperations.getTasks(filters, sort)
        setTasks(demoTasks)
        setLoading(false)
        
        logger.debug('Demo tasks loaded', { count: demoTasks.length })
        return
      } catch (error) {
        logger.error('Failed to load demo tasks', error)
        setError('デモタスクの読み込みに失敗しました')
        setLoading(false)
        return
      }
    }

    // キャッシュチェック
    if (!force) {
      const cachedData = getCachedData()
      if (cachedData) {
        setTasks(cachedData)
        setLoading(false)
        return
      }
    }

    // 進行中のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      
      if (filters?.status && filters.status.length > 0) {
        params.append('status', filters.status.join(','))
      }
      if (filters?.priority && filters.priority.length > 0) {
        params.append('priority', filters.priority.join(','))
      }
      if (filters?.category_id && filters.category_id.length > 0) {
        params.append('category_id', filters.category_id.join(','))
      }
      if (filters?.due_date_from) {
        params.append('due_date_from', filters.due_date_from)
      }
      if (filters?.due_date_to) {
        params.append('due_date_to', filters.due_date_to)
      }
      if (filters?.search) {
        params.append('search', filters.search)
      }
      if (sort?.field) {
        params.append('sort_field', sort.field)
      }
      if (sort?.direction) {
        params.append('sort_direction', sort.direction)
      }

      const response = await fetch(`/api/tasks?${params.toString()}`, {
        signal: abortController.signal
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<TaskWithCategory[]> = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tasks')
      }

      // キャッシュに保存
      setCachedData(result.data)
      setTasks(result.data)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // リクエストがキャンセルされた場合は何もしない
        return
      }
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching tasks'
      setError(errorMessage)
      logger.error('Error fetching tasks', err)
    } finally {
      setLoading(false)
    }
  }, [user, filters, sort, getCachedData, setCachedData])

  const createTask = useCallback(async (taskData: Omit<TaskInsert, 'user_id'>): Promise<Task | null> => {
    if (!user) return null

    // デモモードの場合
    if (user.email === 'demo@taskshoot.com') {
      try {
        const newTask = await demoTaskOperations.createTask(taskData)
        await fetchTasks(true)
        logger.debug('Demo task created', { taskId: newTask.id })
        return newTask as Task
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'デモタスクの作成に失敗しました'
        setError(errorMessage)
        logger.error('Error creating demo task', err)
        return null
      }
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<Task> = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create task')
      }

      // キャッシュをクリア（新しいタスクが追加されたため）
      taskCache.clear()
      
      // タスクリストを再取得
      await fetchTasks(true)
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while creating task'
      setError(errorMessage)
      logger.error('Error creating task', err)
      return null
    }
  }, [user, fetchTasks])

  const updateTask = useCallback(async (
    taskId: string, 
    updates: Omit<TaskUpdate, 'user_id' | 'id'>
  ): Promise<Task | null> => {
    if (!user) return null

    // デモモードの場合
    if (user.email === 'demo@taskshoot.com') {
      try {
        const updatedTask = await demoTaskOperations.updateTask(taskId, updates)
        await fetchTasks(true)
        logger.debug('Demo task updated', { taskId })
        return updatedTask as Task
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'デモタスクの更新に失敗しました'
        setError(errorMessage)
        logger.error('Error updating demo task', err)
        return null
      }
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<Task> = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task')
      }

      // 楽観的更新：ローカル状態をすぐに更新
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...result.data } : task
      ))

      // キャッシュも更新
      if (opts.enableCache) {
        const cached = taskCache.get(cacheKey)
        if (cached) {
          const updatedData = cached.data.map(task => 
            task.id === taskId ? { ...task, ...result.data } : task
          )
          setCachedData(updatedData)
        }
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating task'
      setError(errorMessage)
      logger.error('Error updating task', err)
      return null
    }
  }, [user, cacheKey, opts.enableCache, setCachedData])

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    if (!user) return false

    // デモモードの場合
    if (user.email === 'demo@taskshoot.com') {
      try {
        await demoTaskOperations.deleteTask(taskId)
        await fetchTasks(true)
        logger.debug('Demo task deleted', { taskId })
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'デモタスクの削除に失敗しました'
        setError(errorMessage)
        logger.error('Error deleting demo task', err)
        return false
      }
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<any> = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete task')
      }

      // 楽観的更新：ローカル状態からすぐに削除
      setTasks(prev => prev.filter(task => task.id !== taskId))

      // キャッシュからも削除
      if (opts.enableCache) {
        const cached = taskCache.get(cacheKey)
        if (cached) {
          const updatedData = cached.data.filter(task => task.id !== taskId)
          setCachedData(updatedData)
        }
      }
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while deleting task'
      setError(errorMessage)
      logger.error('Error deleting task', err)
      return false
    }
  }, [user, cacheKey, opts.enableCache, setCachedData])

  // 初回ロードとフィルタ変更時のリフェッチ
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // 定期リフェッチ
  useEffect(() => {
    if (opts.refetchInterval && opts.refetchInterval > 0) {
      const interval = setInterval(() => {
        fetchTasks(true)
      }, opts.refetchInterval)

      return () => clearInterval(interval)
    }
    return undefined
  }, [fetchTasks, opts.refetchInterval])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    tasks,
    loading,
    error,
    refetch: () => fetchTasks(true),
    createTask,
    updateTask,
    deleteTask,
  }
}

export function useTaskStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/tasks/stats')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<TaskStats> = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch task stats')
      }

      setStats(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching task stats'
      setError(errorMessage)
      logger.error('Error fetching task stats', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cacheKey = useMemo(() => `categories:${user?.id}`, [user?.id])

  const getCachedCategories = useCallback(() => {
    if (!user) return null
    const cached = categoryCache.get(cacheKey)
    if (!cached) return null
    
    const isStale = Date.now() - cached.timestamp > DEFAULT_OPTIONS.staleTime!
    return isStale ? null : cached.data
  }, [cacheKey, user])

  const setCachedCategories = useCallback((data: Category[]) => {
    if (!user) return
    categoryCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })
  }, [cacheKey, user])

  const fetchCategories = useCallback(async (force = false) => {
    if (!user) return

    // キャッシュチェック
    if (!force) {
      const cachedData = getCachedCategories()
      if (cachedData) {
        setCategories(cachedData)
        setLoading(false)
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/categories')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<Category[]> = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch categories')
      }

      setCachedCategories(result.data)
      setCategories(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching categories'
      setError(errorMessage)
      logger.error('Error fetching categories', err)
    } finally {
      setLoading(false)
    }
  }, [user, getCachedCategories, setCachedCategories])

  const createCategory = useCallback(async (categoryData: Omit<CategoryInsert, 'user_id'>): Promise<Category | null> => {
    if (!user) return null

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<Category> = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create category')
      }

      // キャッシュをクリア
      categoryCache.clear()
      
      // カテゴリリストを再取得
      await fetchCategories(true)
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while creating category'
      setError(errorMessage)
      logger.error('Error creating category', err)
      return null
    }
  }, [user, fetchCategories])

  const updateCategory = useCallback(async (
    categoryId: string, 
    updates: Omit<CategoryUpdate, 'user_id' | 'id'>
  ): Promise<Category | null> => {
    if (!user) return null

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<Category> = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update category')
      }

      // 楽観的更新
      setCategories(prev => prev.map(category => 
        category.id === categoryId ? result.data : category
      ))

      // キャッシュも更新
      const cached = categoryCache.get(cacheKey)
      if (cached) {
        const updatedData = cached.data.map(category => 
          category.id === categoryId ? result.data : category
        )
        setCachedCategories(updatedData)
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating category'
      setError(errorMessage)
      logger.error('Error updating category', err)
      return null
    }
  }, [user, cacheKey, setCachedCategories])

  const deleteCategory = useCallback(async (categoryId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<any> = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete category')
      }

      // 楽観的更新
      setCategories(prev => prev.filter(category => category.id !== categoryId))

      // キャッシュからも削除
      const cached = categoryCache.get(cacheKey)
      if (cached) {
        const updatedData = cached.data.filter(category => category.id !== categoryId)
        setCachedCategories(updatedData)
      }
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while deleting category'
      setError(errorMessage)
      logger.error('Error deleting category', err)
      return false
    }
  }, [user, cacheKey, setCachedCategories])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories,
    loading,
    error,
    refetch: () => fetchCategories(true),
    createCategory,
    updateCategory,
    deleteCategory,
  }
}