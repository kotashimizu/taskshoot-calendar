import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
// import { GoogleCalendarConfig } from '@/types/google-calendar'

// Google Calendar設定のバリデーションスキーマ
const GoogleCalendarConfigSchema = z.object({
  enabled: z.boolean(),
  selected_calendars: z.array(z.string()).max(10, 'Maximum 10 calendars allowed'),
  sync_frequency: z.enum(['manual', '5min', '15min', '30min', '1hour']),
  sync_direction: z.enum(['both', 'gcal_to_taskshoot', 'taskshoot_to_gcal']),
  auto_sync_enabled: z.boolean(),
})

// type GoogleCalendarConfigInput = z.infer<typeof GoogleCalendarConfigSchema>

/**
 * Google Calendar設定を取得
 */
export async function GET() {
  try {
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

    if (configError) {
      if (configError.code === 'PGRST116') {
        // 設定が存在しない場合はデフォルト設定を作成
        const { data: newConfig, error: createError } = await supabase
          .from('google_calendar_configs')
          .insert({
            user_id: user.id,
            enabled: false,
            selected_calendars: [],
            sync_frequency: '15min',
            sync_direction: 'both',
            auto_sync_enabled: true,
            sync_status: 'idle',
          })
          .select()
          .single()

        if (createError) {
          console.error('Failed to create default config:', createError)
          return NextResponse.json(
            { error: 'Failed to create configuration' },
            { status: 500 }
          )
        }

        return NextResponse.json({ config: newConfig })
      }

      console.error('Failed to fetch config:', configError)
      return NextResponse.json(
        { error: 'Failed to fetch configuration' },
        { status: 500 }
      )
    }

    // アクセストークンを除いてレスポンス
    const { access_token, refresh_token, ...safeConfig } = config

    return NextResponse.json({
      config: {
        ...safeConfig,
        is_connected: !!(access_token && refresh_token),
      },
    })

  } catch (error) {
    console.error('Get Google Calendar config error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Google Calendar設定を更新
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 入力値の検証
    const validationResult = GoogleCalendarConfigSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const configData = validationResult.data

    const supabase = createClient()
    
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 現在の設定を取得
    const { data: currentConfig, error: getCurrentError } = await supabase
      .from('google_calendar_configs')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (getCurrentError) {
      console.error('Failed to get current config:', getCurrentError)
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    // 認証が必要な操作の場合、トークンの存在確認
    if (configData.enabled && !currentConfig.access_token) {
      return NextResponse.json(
        { error: 'Google Calendar authentication required' },
        { status: 400 }
      )
    }

    // 設定を更新
    const updateData = {
      ...configData,
      updated_at: new Date().toISOString(),
    }

    // 同期設定が変更された場合は同期状態をリセット
    if (
      configData.sync_frequency !== currentConfig.sync_frequency ||
      configData.sync_direction !== currentConfig.sync_direction ||
      JSON.stringify(configData.selected_calendars) !== JSON.stringify(currentConfig.selected_calendars)
    ) {
      (updateData as any).sync_status = 'idle'
    }

    const { data: updatedConfig, error: updateError } = await supabase
      .from('google_calendar_configs')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update config:', updateError)
      return NextResponse.json(
        { error: 'Failed to update configuration' },
        { status: 500 }
      )
    }

    // アクセストークンを除いてレスポンス
    const { access_token, refresh_token, ...safeConfig } = updatedConfig

    return NextResponse.json({
      config: {
        ...safeConfig,
        is_connected: !!(access_token && refresh_token),
      },
      message: 'Configuration updated successfully',
    })

  } catch (error) {
    console.error('Update Google Calendar config error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 同期状態を更新
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { sync_status, last_sync_at } = body

    if (!sync_status || !['idle', 'syncing', 'error', 'success'].includes(sync_status)) {
      return NextResponse.json(
        { error: 'Invalid sync_status' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 同期状態を更新
    const updateData = {
      sync_status,
      updated_at: new Date().toISOString(),
    }

    if (last_sync_at) {
      (updateData as any).last_sync_at = last_sync_at
    }

    const { data: updatedConfig, error: updateError } = await supabase
      .from('google_calendar_configs')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update sync status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update sync status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sync_status: updatedConfig.sync_status,
      last_sync_at: updatedConfig.last_sync_at,
      message: 'Sync status updated successfully',
    })

  } catch (error) {
    console.error('Update sync status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 同期統計を取得
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action !== 'stats') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 同期統計を取得（過去30日間）
    const { data: stats, error: statsError } = await supabase
      .rpc('get_sync_stats', {
        user_uuid: user.id,
        days_back: 30,
      })

    if (statsError) {
      console.error('Failed to get sync stats:', statsError)
      return NextResponse.json(
        { error: 'Failed to get sync statistics' },
        { status: 500 }
      )
    }

    // 最新の同期ログを取得
    const { data: recentLogs, error: logsError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(5)

    if (logsError) {
      console.error('Failed to get recent logs:', logsError)
      return NextResponse.json(
        { error: 'Failed to get recent logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      stats: stats[0] || {
        total_syncs: 0,
        successful_syncs: 0,
        failed_syncs: 0,
        events_processed: 0,
        last_sync_at: null,
      },
      recent_logs: recentLogs,
    })

  } catch (error) {
    console.error('Get sync stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}