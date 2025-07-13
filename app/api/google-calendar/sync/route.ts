import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getGoogleCredentialsFromEnv, createGoogleCalendarClient } from '@/lib/google-calendar/client'
import { 
  taskToGoogleEvent, 
  googleEventToTask, 
  isTaskShootEvent,
  shouldExcludeFromSync 
} from '@/lib/google-calendar/converter'
import { SyncError } from '@/types/google-calendar'
import { TaskWithCategory } from '@/types/tasks'

// 同期リクエストのバリデーションスキーマ
const SyncRequestSchema = z.object({
  direction: z.enum(['import', 'export', 'bidirectional']).optional().default('bidirectional'),
  calendar_ids: z.array(z.string()).optional(),
  dry_run: z.boolean().optional().default(false),
})

type SyncRequest = z.infer<typeof SyncRequestSchema>

/**
 * 手動同期の実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 入力値の検証
    const validationResult = SyncRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const syncRequest = validationResult.data

    const supabase = createClient()
    
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Google Calendar設定を取得
    const { data: config, error: configError } = await supabase
      .from('google_calendar_configs')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (configError || !config || !config.enabled) {
      return NextResponse.json(
        { error: 'Google Calendar not configured or disabled' },
        { status: 400 }
      )
    }

    if (!config.access_token) {
      return NextResponse.json(
        { error: 'Google Calendar authentication required' },
        { status: 401 }
      )
    }

    // 同期中の場合は拒否
    if (config.sync_status === 'syncing') {
      return NextResponse.json(
        { error: 'Sync already in progress' },
        { status: 409 }
      )
    }

    // 同期ログエントリを作成
    const syncLogId = crypto.randomUUID()
    const syncStartTime = new Date()

    await supabase
      .from('sync_logs')
      .insert({
        id: syncLogId,
        user_id: user.id,
        sync_type: 'manual',
        direction: syncRequest.direction,
        status: 'success', // 一時的に成功として開始
        started_at: syncStartTime.toISOString(),
      })

    // 同期状態を更新
    await supabase
      .from('google_calendar_configs')
      .update({ sync_status: 'syncing' })
      .eq('user_id', user.id)

    try {
      // Google Calendar APIクライアントを初期化
      const credentials = getGoogleCredentialsFromEnv()
      const client = createGoogleCalendarClient(credentials)
      client.setTokens({
        access_token: config.access_token,
        refresh_token: config.refresh_token || undefined,
        scope: '',
        token_type: 'Bearer',
      })

      // トークンの有効性確認
      const isValidToken = await client.verifyToken()
      if (!isValidToken) {
        // リフレッシュトークンで再試行
        if (config.refresh_token) {
          const refreshedTokens = await client.refreshToken()
          
          // 新しいトークンを保存
          await supabase
            .from('google_calendar_configs')
            .update({
              access_token: refreshedTokens.access_token,
              refresh_token: refreshedTokens.refresh_token || config.refresh_token,
            })
            .eq('user_id', user.id)
          
          client.setTokens(refreshedTokens)
        } else {
          throw new Error('Invalid or expired tokens')
        }
      }

      // 同期を実行
      const syncResult = await executeBidirectionalSync(
        client,
        supabase,
        user.id,
        config,
        syncRequest
      )

      // 同期ログを更新
      await supabase
        .from('sync_logs')
        .update({
          status: syncResult.errors.length > 0 ? 'partial' : 'success',
          completed_at: new Date().toISOString(),
          events_processed: syncResult.eventsProcessed,
          events_created: syncResult.eventsCreated,
          events_updated: syncResult.eventsUpdated,
          events_deleted: syncResult.eventsDeleted,
          errors: syncResult.errors,
        })
        .eq('id', syncLogId)

      // 同期状態を更新
      await supabase
        .from('google_calendar_configs')
        .update({
          sync_status: syncResult.errors.length > 0 ? 'error' : 'success',
          last_sync_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      return NextResponse.json({
        success: true,
        sync_id: syncLogId,
        result: syncResult,
        dry_run: syncRequest.dry_run,
      })

    } catch (error) {
      console.error('Sync execution error:', error)

      // エラー情報を同期ログに記録
      const errorInfo: SyncError = {
        type: 'api_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { timestamp: new Date().toISOString() },
      }

      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          errors: [errorInfo],
        })
        .eq('id', syncLogId)

      await supabase
        .from('google_calendar_configs')
        .update({ sync_status: 'error' })
        .eq('user_id', user.id)

      return NextResponse.json(
        { error: 'Sync failed', details: errorInfo.message },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Sync request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 双方向同期の実行
 */
async function executeBidirectionalSync(
  client: any, // GoogleCalendarClient
  supabase: any,
  userId: string,
  config: any,
  request: SyncRequest
) {
  const result = {
    eventsProcessed: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsDeleted: 0,
    errors: [] as SyncError[],
  }

  const calendarIds = request.calendar_ids || config.selected_calendars || []

  try {
    // Import: Google Calendar → TaskShoot
    if (request.direction === 'import' || request.direction === 'bidirectional') {
      const importResult = await importFromGoogleCalendar(
        client,
        supabase,
        userId,
        calendarIds,
        request.dry_run
      )
      
      result.eventsProcessed += importResult.eventsProcessed
      result.eventsCreated += importResult.eventsCreated
      result.eventsUpdated += importResult.eventsUpdated
      result.errors.push(...importResult.errors)
    }

    // Export: TaskShoot → Google Calendar
    if (request.direction === 'export' || request.direction === 'bidirectional') {
      const exportResult = await exportToGoogleCalendar(
        client,
        supabase,
        userId,
        calendarIds[0] || 'primary', // 最初のカレンダーに出力
        request.dry_run
      )
      
      result.eventsProcessed += exportResult.eventsProcessed
      result.eventsCreated += exportResult.eventsCreated
      result.eventsUpdated += exportResult.eventsUpdated
      result.eventsDeleted += exportResult.eventsDeleted
      result.errors.push(...exportResult.errors)
    }

  } catch (error) {
    result.errors.push({
      type: 'api_error',
      message: error instanceof Error ? error.message : 'Sync execution failed',
    })
  }

  return result
}

/**
 * Google Calendar → TaskShoot インポート
 */
async function importFromGoogleCalendar(
  client: any,
  supabase: any,
  userId: string,
  calendarIds: string[],
  dryRun: boolean
) {
  const result = {
    eventsProcessed: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    errors: [] as SyncError[],
  }

  for (const calendarId of calendarIds) {
    try {
      // 過去1ヶ月から未来3ヶ月のイベントを取得
      const timeMin = new Date()
      timeMin.setMonth(timeMin.getMonth() - 1)
      const timeMax = new Date()
      timeMax.setMonth(timeMax.getMonth() + 3)

      const eventsResponse = await client.getEvents(calendarId, timeMin, timeMax)
      
      for (const event of eventsResponse.events) {
        result.eventsProcessed++

        try {
          // 同期除外対象をスキップ
          if (shouldExcludeFromSync(event)) {
            continue
          }

          // TaskShootが作成したイベントをスキップ
          if (isTaskShootEvent(event)) {
            continue
          }

          if (!dryRun) {
            // Google EventをTaskに変換
            const taskData = googleEventToTask(event, userId)

            // 既存のタスクをチェック
            const { data: existingSync } = await supabase
              .from('google_event_sync')
              .select('task_id')
              .eq('user_id', userId)
              .eq('google_event_id', event.id)
              .single()

            if (existingSync?.task_id) {
              // 既存タスクを更新
              await supabase
                .from('tasks')
                .update({
                  ...taskData,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingSync.task_id)
                .eq('user_id', userId)

              result.eventsUpdated++
            } else {
              // 新しいタスクを作成
              const { data: newTask, error: taskError } = await supabase
                .from('tasks')
                .insert({
                  ...taskData,
                  user_id: userId,
                })
                .select()
                .single()

              if (taskError) {
                result.errors.push({
                  type: 'validation_error',
                  message: `Failed to create task: ${taskError.message}`,
                  google_event_id: event.id,
                })
                continue
              }

              // 同期レコードを作成
              await supabase
                .from('google_event_sync')
                .insert({
                  user_id: userId,
                  task_id: newTask.id,
                  google_event_id: event.id,
                  google_calendar_id: calendarId,
                  sync_status: 'synced',
                })

              result.eventsCreated++
            }
          }

        } catch (error) {
          result.errors.push({
            type: 'api_error',
            message: error instanceof Error ? error.message : 'Import event failed',
            google_event_id: event.id,
          })
        }
      }

    } catch (error) {
      result.errors.push({
        type: 'api_error',
        message: `Failed to fetch events from calendar ${calendarId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  return result
}

/**
 * TaskShoot → Google Calendar エクスポート
 */
async function exportToGoogleCalendar(
  client: any,
  supabase: any,
  userId: string,
  targetCalendarId: string,
  dryRun: boolean
) {
  const result = {
    eventsProcessed: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsDeleted: 0,
    errors: [] as SyncError[],
  }

  try {
    // 過去1週間から未来1ヶ月のタスクを取得
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 7)
    const timeMax = new Date()
    timeMax.setMonth(timeMax.getMonth() + 1)

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('user_id', userId)
      .gte('start_date', timeMin.toISOString())
      .lte('due_date', timeMax.toISOString())
      .neq('status', 'cancelled')

    if (tasksError) {
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`)
    }

    for (const task of tasks as TaskWithCategory[]) {
      result.eventsProcessed++

      try {
        if (!dryRun) {
          // 既存の同期レコードをチェック
          const { data: existingSync } = await supabase
            .from('google_event_sync')
            .select('google_event_id')
            .eq('user_id', userId)
            .eq('task_id', task.id)
            .single()

          const googleEvent = taskToGoogleEvent(task, targetCalendarId)

          if (existingSync?.google_event_id) {
            // 既存イベントを更新
            try {
              await client.updateEvent(
                targetCalendarId,
                existingSync.google_event_id,
                googleEvent
              )
              result.eventsUpdated++
            } catch (updateError) {
              // イベントが削除されている場合は新しく作成
              const newEvent = await client.createEvent(targetCalendarId, googleEvent)
              
              await supabase
                .from('google_event_sync')
                .update({
                  google_event_id: newEvent.id,
                  sync_status: 'synced',
                  last_sync_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('task_id', task.id)

              result.eventsCreated++
            }
          } else {
            // 新しいイベントを作成
            const newEvent = await client.createEvent(targetCalendarId, googleEvent)

            await supabase
              .from('google_event_sync')
              .insert({
                user_id: userId,
                task_id: task.id,
                google_event_id: newEvent.id,
                google_calendar_id: targetCalendarId,
                sync_status: 'synced',
              })

            result.eventsCreated++
          }
        }

      } catch (error) {
        result.errors.push({
          type: 'api_error',
          message: error instanceof Error ? error.message : 'Export task failed',
          event_id: task.id,
        })
      }
    }

  } catch (error) {
    result.errors.push({
      type: 'api_error',
      message: `Failed to export tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }

  return result
}