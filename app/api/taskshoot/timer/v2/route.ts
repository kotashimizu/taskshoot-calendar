/**
 * TaskShoot Phase 5: リアルタイム時間計測API v2
 * 高度な時間計測機能とセッション管理
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  parseRequestBody
} from '@/lib/api/auth-middleware'
import { getSupabaseClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// バリデーションスキーマ
const timerActionSchema = z.object({
  action: z.enum(['start', 'stop', 'pause', 'resume']),
  task_id: z.string().uuid().optional(),
  record_id: z.string().uuid().optional(),
  work_session_type: z.enum(['normal', 'focus', 'break', 'review']).optional(),
  interruption_reason: z.string().optional(),
  focus_score: z.number().min(1).max(10).optional(),
  notes: z.string().optional()
})


/**
 * GET /api/taskshoot/timer/v2 - タイマー状態取得
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error) return error

    const url = new URL(request.url)
    const params = {
      user_id: url.searchParams.get('user_id') || user!.id,
      task_id: url.searchParams.get('task_id'),
      include_sessions: url.searchParams.get('include_sessions') === 'true'
    }

    const supabase = getSupabaseClient()

    // アクティブな時間記録を取得
    let query = supabase
      .from('time_records')
      .select(`
        *,
        tasks!inner(
          id,
          title,
          description,
          priority,
          estimated_minutes
        )
      `)
      .eq('user_id', params.user_id)
      .eq('status', 'active')

    if (params.task_id) {
      query = query.eq('task_id', params.task_id)
    }

    const { data: activeRecords, error: recordError } = await query

    if (recordError) {
      logger.error('Failed to fetch active timer records', recordError)
      throw new Error('タイマー状態の取得に失敗しました')
    }

    // セッション詳細を含める場合
    let sessions = null
    if (params.include_sessions && activeRecords && activeRecords.length > 0) {
      const { data: sessionData, error: sessionError } = await supabase
        .from('time_sessions')
        .select('*')
        .eq('time_record_id', activeRecords[0].id)
        .order('session_start', { ascending: false })

      if (!sessionError) {
        sessions = sessionData
      }
    }

    // 現在の状態を計算
    const timerState = activeRecords && activeRecords.length > 0 ? {
      isActive: true,
      currentRecord: activeRecords[0],
      elapsed: calculateElapsedTime(activeRecords[0]),
      sessions: sessions
    } : {
      isActive: false,
      currentRecord: null,
      elapsed: 0,
      sessions: null
    }

    return createSuccessResponse(timerState)

  } catch (error) {
    return createErrorResponse(error, 'Failed to get timer state')
  }
}

/**
 * POST /api/taskshoot/timer/v2 - タイマー操作
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error) return error

    const body = await parseRequestBody<typeof timerActionSchema._type>(request)
    const { action, task_id, record_id, work_session_type, interruption_reason, focus_score, notes } = timerActionSchema.parse(body)

    const supabase = getSupabaseClient()

    let result
    let message

    switch (action) {
      case 'start':
        if (!task_id) {
          throw new Error('タスクIDは必須です')
        }

        // 既存のアクティブなタイマーをチェック
        const { data: existingActive } = await supabase
          .from('time_records')
          .select('id, task_id, tasks(title)')
          .eq('user_id', user!.id)
          .eq('status', 'active')
          .single()

        if (existingActive) {
          throw new Error(`既にタスク「${(existingActive as any).tasks?.title || 'Unknown'}」でタイマーが動作中です`)
        }

        // 新しい時間記録を開始
        const { data: newRecord, error: createError } = await supabase
          .from('time_records')
          .insert({
            user_id: user!.id,
            task_id,
            started_at: new Date().toISOString(),
            status: 'active',
            work_session_type: work_session_type || 'normal',
            notes
          })
          .select(`
            *,
            tasks!inner(id, title, description, priority, estimated_minutes)
          `)
          .single()

        if (createError) {
          logger.error('Failed to create time record', createError)
          throw new Error('タイマーの開始に失敗しました')
        }

        // 初期セッション記録
        await supabase
          .from('time_sessions')
          .insert({
            time_record_id: newRecord.id,
            user_id: user!.id,
            session_start: new Date().toISOString(),
            session_type: 'work'
          })

        result = newRecord
        message = `タスク「${newRecord.tasks.title}」のタイマーを開始しました`
        
        logger.info('Timer started', {
          userId: user!.id,
          taskId: task_id,
          recordId: newRecord.id
        })
        break

      case 'stop':
        if (!record_id) {
          throw new Error('記録IDは必須です')
        }

        // 時間記録を完了状態に更新
        const { data: stoppedRecord, error: stopError } = await supabase
          .from('time_records')
          .update({
            ended_at: new Date().toISOString(),
            status: 'completed',
            focus_score,
            notes: notes || undefined
          })
          .eq('id', record_id)
          .eq('user_id', user!.id)
          .eq('status', 'active')
          .select(`
            *,
            tasks!inner(id, title, description, priority, estimated_minutes)
          `)
          .single()

        if (stopError) {
          logger.error('Failed to stop time record', stopError)
          throw new Error('タイマーの停止に失敗しました')
        }

        // 最後のセッションを終了
        await supabase
          .from('time_sessions')
          .update({
            session_end: new Date().toISOString(),
            productivity_rating: focus_score
          })
          .eq('time_record_id', record_id)
          .is('session_end', null)

        result = stoppedRecord
        message = `タスク「${stoppedRecord.tasks.title}」のタイマーを停止しました`
        
        logger.info('Timer stopped', {
          userId: user!.id,
          recordId: record_id,
          duration: calculateElapsedTime(stoppedRecord)
        })
        break

      case 'pause':
        if (!record_id) {
          throw new Error('記録IDは必須です')
        }

        // 時間記録を一時停止状態に更新
        const { data: pausedRecord, error: pauseError } = await supabase
          .from('time_records')
          .update({
            paused_at: new Date().toISOString(),
            status: 'paused'
          })
          .eq('id', record_id)
          .eq('user_id', user!.id)
          .eq('status', 'active')
          .select(`
            *,
            tasks!inner(id, title, description, priority, estimated_minutes)
          `)
          .single()

        if (pauseError) {
          logger.error('Failed to pause time record', pauseError)
          throw new Error('タイマーの一時停止に失敗しました')
        }

        // 中断セッション記録
        await supabase
          .from('time_sessions')
          .insert({
            time_record_id: record_id,
            user_id: user!.id,
            session_start: new Date().toISOString(),
            session_type: 'interruption',
            interruption_reason
          })

        result = pausedRecord
        message = `タスク「${pausedRecord.tasks.title}」のタイマーを一時停止しました`
        
        logger.info('Timer paused', {
          userId: user!.id,
          recordId: record_id,
          reason: interruption_reason
        })
        break

      case 'resume':
        if (!record_id) {
          throw new Error('記録IDは必須です')
        }

        // 時間記録を再開状態に更新
        const now = new Date()
        const { data: currentRecord } = await supabase
          .from('time_records')
          .select('paused_at, total_paused_duration')
          .eq('id', record_id)
          .single()

        if (!currentRecord || !currentRecord.paused_at) {
          throw new Error('一時停止中のタイマーが見つかりません')
        }

        // 一時停止時間を計算
        const pauseDuration = new Date(now).getTime() - new Date(currentRecord.paused_at).getTime()
        const currentPausedMs = intervalToMilliseconds(currentRecord.total_paused_duration || '0 seconds')
        const newTotalPausedMs = currentPausedMs + pauseDuration
        
        const { data: resumedRecord, error: resumeError } = await supabase
          .from('time_records')
          .update({
            paused_at: null,
            status: 'active',
            total_paused_duration: `${newTotalPausedMs} milliseconds`
          })
          .eq('id', record_id)
          .eq('user_id', user!.id)
          .eq('status', 'paused')
          .select(`
            *,
            tasks!inner(id, title, description, priority, estimated_minutes)
          `)
          .single()

        if (resumeError) {
          logger.error('Failed to resume time record', resumeError)
          throw new Error('タイマーの再開に失敗しました')
        }

        // 再開セッション記録
        await supabase
          .from('time_sessions')
          .insert({
            time_record_id: record_id,
            user_id: user!.id,
            session_start: now.toISOString(),
            session_type: 'work'
          })

        result = resumedRecord
        message = `タスク「${resumedRecord.tasks.title}」のタイマーを再開しました`
        
        logger.info('Timer resumed', {
          userId: user!.id,
          recordId: record_id,
          pauseDuration: pauseDuration
        })
        break

      default:
        throw new Error('無効な操作です')
    }

    return createSuccessResponse({
      record: result,
      action,
      elapsed: calculateElapsedTime(result)
    }, 200, message)

  } catch (error) {
    return createErrorResponse(error, 'Failed to perform timer action')
  }
}

/**
 * 経過時間を計算（ミリ秒）
 */
function calculateElapsedTime(record: any): number {
  if (!record.started_at) return 0

  const start = new Date(record.started_at).getTime()
  const end = record.ended_at ? new Date(record.ended_at).getTime() : Date.now()
  const totalElapsed = end - start

  // 一時停止時間を差し引く
  const pausedMs = intervalToMilliseconds(record.total_paused_duration || '0 seconds')
  
  return Math.max(0, totalElapsed - pausedMs)
}

/**
 * PostgreSQL INTERVAL を ミリ秒に変換
 */
function intervalToMilliseconds(interval: string): number {
  // 簡易実装: "X milliseconds" 形式をパース
  const match = interval.match(/(\d+)\s*(milliseconds?|seconds?|minutes?|hours?)/)
  if (!match) return 0

  const value = parseInt(match[1]!)
  const unit = match[2]!

  switch (unit) {
    case 'millisecond':
    case 'milliseconds':
      return value
    case 'second':
    case 'seconds':
      return value * 1000
    case 'minute':
    case 'minutes':
      return value * 60 * 1000
    case 'hour':
    case 'hours':
      return value * 60 * 60 * 1000
    default:
      return 0
  }
}