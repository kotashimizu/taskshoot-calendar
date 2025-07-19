/**
 * タスクシュート機能
 * シンプルで実用的な時間管理サービス
 */

import { getSupabaseClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

// タスクシュート関連型定義
export interface TaskEstimate {
  id: string
  task_id: string
  user_id: string
  estimated_minutes: number
  confidence_level: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface TimeRecord {
  id: string
  task_id: string
  user_id: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  productivity_rating?: number
  notes?: string
  created_at: string
}

export interface TaskShootStats {
  totalTasks: number
  totalEstimatedMinutes: number
  totalActualMinutes: number
  averageAccuracy: number
  efficiencyScore: number
}

export interface TimerState {
  isRunning: boolean
  taskId?: string
  startTime?: Date
  elapsedSeconds: number
}

/**
 * タスクシュート機能のメインサービス
 */
export class TaskShootService {
  private timerState: TimerState = {
    isRunning: false,
    elapsedSeconds: 0
  }
  
  private interval?: NodeJS.Timeout
  private callbacks: Set<(state: TimerState) => void> = new Set()

  /**
   * 時間見積もりを作成
   */
  async createEstimate(
    userId: string, 
    taskId: string, 
    estimatedMinutes: number, 
    confidenceLevel: number = 50,
    notes?: string
  ): Promise<TaskEstimate> {
    try {
      logger.debug('Creating task estimate', { userId, taskId, estimatedMinutes })

      const supabase = getSupabaseClient()
      // 既存の見積もりがあれば更新、なければ作成
      const { data: existing } = await supabase
        .from('time_estimates')
        .select('id')
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .eq('is_active', true)
        .single()

      if (existing) {
        const { data, error } = await supabase
          .from('time_estimates')
          .update({
            estimated_minutes: estimatedMinutes,
            confidence_level: confidenceLevel,
            notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase
          .from('time_estimates')
          .insert({
            user_id: userId,
            task_id: taskId,
            estimated_minutes: estimatedMinutes,
            confidence_level: confidenceLevel,
            notes,
            is_active: true
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    } catch (error) {
      logger.error('Failed to create estimate', { error, userId, taskId })
      throw new Error('見積もりの作成に失敗しました')
    }
  }

  /**
   * タイマーを開始
   */
  async startTimer(userId: string, taskId: string, notes?: string): Promise<TimeRecord> {
    try {
      if (this.timerState.isRunning) {
        throw new Error('既にタイマーが実行中です')
      }

      logger.debug('Starting timer', { userId, taskId })

      const supabase = getSupabaseClient()
      // データベースに時間記録を作成
      const { data, error } = await supabase
        .from('time_records')
        .insert({
          user_id: userId,
          task_id: taskId,
          start_time: new Date().toISOString(),
          notes,
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error

      // タイマー状態を更新
      this.timerState = {
        isRunning: true,
        taskId,
        startTime: new Date(),
        elapsedSeconds: 0
      }

      // タイマーを開始
      this.startInterval()
      this.notifyStateChange()

      logger.info('Timer started successfully', { recordId: data.id })
      return data
    } catch (error) {
      logger.error('Failed to start timer', { error, userId, taskId })
      throw new Error('タイマーの開始に失敗しました')
    }
  }

  /**
   * タイマーを停止
   */
  async stopTimer(
    userId: string, 
    recordId: string, 
    productivityRating?: number,
    notes?: string
  ): Promise<TimeRecord> {
    try {
      if (!this.timerState.isRunning) {
        throw new Error('実行中のタイマーがありません')
      }

      logger.debug('Stopping timer', { userId, recordId })

      const supabase = getSupabaseClient()
      const endTime = new Date().toISOString()

      // データベースの時間記録を更新
      const { data, error } = await supabase
        .from('time_records')
        .update({
          end_time: endTime,
          productivity_rating: productivityRating,
          notes,
          status: 'completed'
        })
        .eq('id', recordId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      // タイマー状態をリセット
      this.stopInterval()
      this.timerState = {
        isRunning: false,
        elapsedSeconds: 0
      }
      this.notifyStateChange()

      logger.info('Timer stopped successfully', { recordId, duration: data.duration_minutes })
      return data
    } catch (error) {
      logger.error('Failed to stop timer', { error, userId, recordId })
      throw new Error('タイマーの停止に失敗しました')
    }
  }

  /**
   * 現在のタイマー状態を取得
   */
  getTimerState(): TimerState {
    return { ...this.timerState }
  }

  /**
   * タイマー状態の変更を監視
   */
  onStateChange(callback: (state: TimerState) => void): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  /**
   * タスクの見積もりを取得
   */
  async getEstimate(userId: string, taskId: string): Promise<TaskEstimate | null> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('time_estimates')
        .select('*')
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    } catch (error) {
      logger.error('Failed to get estimate', { error, userId, taskId })
      return null
    }
  }

  /**
   * タスクの実績時間を取得
   */
  async getTimeRecords(userId: string, taskId?: string): Promise<TimeRecord[]> {
    try {
      const supabase = getSupabaseClient()
      let query = supabase
        .from('time_records')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })

      if (taskId) {
        query = query.eq('task_id', taskId)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('Failed to get time records', { error, userId, taskId })
      return []
    }
  }

  /**
   * ユーザーの統計情報を取得
   */
  async getStats(userId: string, startDate?: string, endDate?: string): Promise<TaskShootStats> {
    try {
      logger.debug('Getting stats', { userId, startDate, endDate })

      const supabase = getSupabaseClient()
      // 基本クエリ
      const estimatesQuery = supabase
        .from('time_estimates')
        .select('estimated_minutes')
        .eq('user_id', userId)
        .eq('is_active', true)

      let recordsQuery = supabase
        .from('time_records')
        .select('duration_minutes, productivity_rating')
        .eq('user_id', userId)
        .eq('status', 'completed')

      // 日付フィルター
      if (startDate) {
        recordsQuery = recordsQuery.gte('start_time', startDate)
      }
      if (endDate) {
        recordsQuery = recordsQuery.lte('start_time', endDate)
      }

      const [estimatesResult, recordsResult] = await Promise.all([
        estimatesQuery,
        recordsQuery
      ])

      if (estimatesResult.error) throw estimatesResult.error
      if (recordsResult.error) throw recordsResult.error

      const estimates = estimatesResult.data || []
      const records = recordsResult.data || []

      // 統計計算
      const totalEstimatedMinutes = estimates.reduce((sum: number, e: any) => sum + e.estimated_minutes, 0)
      const totalActualMinutes = records.reduce((sum: number, r: any) => sum + (r.duration_minutes || 0), 0)
      
      const accuracy = totalEstimatedMinutes > 0 
        ? (totalActualMinutes / totalEstimatedMinutes) * 100
        : 0

      const efficiencyScore = records.length > 0
        ? records.reduce((sum: number, r: any) => sum + (r.productivity_rating || 3), 0) / records.length
        : 0

      return {
        totalTasks: estimates.length,
        totalEstimatedMinutes,
        totalActualMinutes,
        averageAccuracy: Math.round(accuracy * 100) / 100,
        efficiencyScore: Math.round(efficiencyScore * 100) / 100
      }
    } catch (error) {
      logger.error('Failed to get stats', { error, userId })
      return {
        totalTasks: 0,
        totalEstimatedMinutes: 0,
        totalActualMinutes: 0,
        averageAccuracy: 0,
        efficiencyScore: 0
      }
    }
  }

  /**
   * アクティブな時間記録を取得
   */
  async getActiveRecord(userId: string): Promise<TimeRecord | null> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('time_records')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('Failed to get active record', { error, userId })
      return null
    }
  }

  /**
   * 効率性分析データを取得
   */
  async getEfficiencyAnalysis(userId: string): Promise<{
    taskEfficiency: Array<{ taskId: string; efficiency: number; count: number }>
    dailyProductivity: Array<{ date: string; averageRating: number; totalMinutes: number }>
  }> {
    try {
      const supabase = getSupabaseClient()
      // タスク別効率性
      const { data: taskData, error: taskError } = await supabase
        .from('time_records')
        .select('task_id, duration_minutes, productivity_rating')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('productivity_rating', 'is', null)

      if (taskError) throw taskError

      const taskEfficiency = (taskData || [])
        .reduce((acc: any[], record: any) => {
          const existing = acc.find(item => item.taskId === record.task_id)
          if (existing) {
            existing.totalRating += record.productivity_rating
            existing.count += 1
            existing.efficiency = existing.totalRating / existing.count
          } else {
            acc.push({
              taskId: record.task_id,
              efficiency: record.productivity_rating,
              totalRating: record.productivity_rating,
              count: 1
            })
          }
          return acc
        }, [])
        .map(({ taskId, efficiency, count }: any) => ({ taskId, efficiency, count }))

      // 日別生産性
      const { data: dailyData, error: dailyError } = await supabase
        .from('time_records')
        .select('start_time, duration_minutes, productivity_rating')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('start_time', { ascending: false })
        .limit(30)

      if (dailyError) throw dailyError

      const dailyProductivity = (dailyData || [])
        .reduce((acc: any[], record: any) => {
          const date = record.start_time.split('T')[0]
          const existing = acc.find(item => item.date === date)
          
          if (existing) {
            existing.totalRating += record.productivity_rating || 3
            existing.totalMinutes += record.duration_minutes || 0
            existing.count += 1
            existing.averageRating = existing.totalRating / existing.count
          } else {
            acc.push({
              date,
              averageRating: record.productivity_rating || 3,
              totalMinutes: record.duration_minutes || 0,
              totalRating: record.productivity_rating || 3,
              count: 1
            })
          }
          return acc
        }, [])
        .map(({ date, averageRating, totalMinutes }: any) => ({ 
          date, 
          averageRating: Math.round(averageRating * 100) / 100, 
          totalMinutes 
        }))

      return { taskEfficiency, dailyProductivity }
    } catch (error) {
      logger.error('Failed to get efficiency analysis', { error, userId })
      return { taskEfficiency: [], dailyProductivity: [] }
    }
  }

  /**
   * タイマー間隔処理
   */
  private startInterval(): void {
    this.interval = setInterval(() => {
      if (this.timerState.isRunning) {
        this.timerState.elapsedSeconds++
        this.notifyStateChange()
      }
    }, 1000)
  }

  /**
   * タイマー間隔停止
   */
  private stopInterval(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = undefined
    }
  }

  /**
   * 状態変更通知
   */
  private notifyStateChange(): void {
    this.callbacks.forEach(callback => callback(this.getTimerState()))
  }
}

// シングルトンインスタンス
export const taskShootService = new TaskShootService()

// 便利関数
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours > 0) {
    return `${hours}時間${mins > 0 ? `${mins}分` : ''}`
  } else {
    return `${mins}分`
  }
}

export function calculateEfficiency(estimated: number, actual: number): number {
  if (estimated === 0) return 0
  return Math.round((estimated / actual) * 100)
}