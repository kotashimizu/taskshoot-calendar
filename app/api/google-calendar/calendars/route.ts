import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleCredentialsFromEnv, createGoogleCalendarClient } from '@/lib/google-calendar/client'
import { googleCalendarCache, getCalendarListCacheKey } from '@/lib/cache'

/**
 * Google Calendarのカレンダー一覧を取得
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

    // Google Calendar APIクライアントを初期化
    const credentials = getGoogleCredentialsFromEnv()
    const client = createGoogleCalendarClient(credentials)
    client.setTokens({
      access_token: config.access_token,
      refresh_token: config.refresh_token || undefined,
      scope: '',
      token_type: 'Bearer',
    })

    try {
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
          return NextResponse.json(
            { error: 'Authentication expired. Please reconnect Google Calendar.' },
            { status: 401 }
          )
        }
      }

      // キャッシュをチェック
      const cacheKey = getCalendarListCacheKey(user.id)
      const cachedCalendars = googleCalendarCache.get(cacheKey)
      
      if (cachedCalendars) {
        return NextResponse.json(cachedCalendars)
      }

      // カレンダー一覧を取得
      const calendarsResponse = await client.getCalendarList()
      
      // カレンダー情報を整理
      const calendars = calendarsResponse.calendars
        .filter(calendar => 
          // 削除されたカレンダーや非表示カレンダーを除外
          calendar.deleted !== true && 
          calendar.hidden !== true &&
          // 読み取り可能なカレンダーのみ
          calendar.accessRole && 
          ['reader', 'writer', 'owner'].includes(calendar.accessRole)
        )
        .map(calendar => ({
          id: calendar.id,
          summary: calendar.summary,
          description: calendar.description,
          primary: calendar.primary,
          accessRole: calendar.accessRole,
          backgroundColor: calendar.backgroundColor,
          foregroundColor: calendar.foregroundColor,
          timeZone: calendar.timeZone,
          selected: config.selected_calendars?.includes(calendar.id || '') || false,
        }))
        .sort((a, b) => {
          // プライマリカレンダーを最初に、その後はアルファベット順
          if (a.primary && !b.primary) return -1
          if (!a.primary && b.primary) return 1
          return (a.summary || '').localeCompare(b.summary || '')
        })

      const response = {
        calendars,
        total: calendars.length,
        message: 'Calendars fetched successfully',
      }

      // 結果をキャッシュ（10分間）
      googleCalendarCache.set(cacheKey, response, 10 * 60 * 1000)

      return NextResponse.json(response)

    } catch (apiError) {
      console.error('Google Calendar API error:', apiError)
      
      // 認証エラーの場合
      if (apiError && typeof apiError === 'object' && 'code' in apiError) {
        if (apiError.code === 401 || apiError.code === 403) {
          return NextResponse.json(
            { error: 'Authentication expired. Please reconnect Google Calendar.' },
            { status: 401 }
          )
        }
      }

      return NextResponse.json(
        { error: 'Failed to fetch calendars from Google Calendar' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Get calendars error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 選択したカレンダーの設定を更新
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { selected_calendar_ids } = body

    if (!Array.isArray(selected_calendar_ids)) {
      return NextResponse.json(
        { error: 'selected_calendar_ids must be an array' },
        { status: 400 }
      )
    }

    if (selected_calendar_ids.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 calendars can be selected' },
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

    // 選択カレンダーを更新
    const { data: updatedConfig, error: updateError } = await supabase
      .from('google_calendar_configs')
      .update({
        selected_calendars: selected_calendar_ids,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update selected calendars:', updateError)
      return NextResponse.json(
        { error: 'Failed to update calendar selection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      selected_calendars: updatedConfig.selected_calendars,
      message: 'Calendar selection updated successfully',
    })

  } catch (error) {
    console.error('Update calendar selection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 特定のカレンダーの詳細情報とイベント数を取得
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { calendar_id } = body

    if (!calendar_id) {
      return NextResponse.json(
        { error: 'calendar_id is required' },
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

    // Google Calendar設定を取得
    const { data: config, error: configError } = await supabase
      .from('google_calendar_configs')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (configError || !config || !config.access_token) {
      return NextResponse.json(
        { error: 'Google Calendar not configured' },
        { status: 400 }
      )
    }

    // Google Calendar APIクライアントを初期化
    const credentials = getGoogleCredentialsFromEnv()
    const client = createGoogleCalendarClient(credentials)
    client.setTokens({
      access_token: config.access_token,
      refresh_token: config.refresh_token || undefined,
      scope: '',
      token_type: 'Bearer',
    })

    try {
      // 今後1ヶ月のイベント数を取得
      const timeMin = new Date()
      const timeMax = new Date()
      timeMax.setMonth(timeMax.getMonth() + 1)

      const eventsResponse = await client.getEvents(calendar_id, timeMin, timeMax)
      
      const eventStats = {
        total_events: eventsResponse.events.length,
        upcoming_events: eventsResponse.events.filter(event => {
          const eventStart = event.start?.dateTime || event.start?.date
          return eventStart && new Date(eventStart) > new Date()
        }).length,
        taskshoot_events: eventsResponse.events.filter(event => 
          event.extendedProperties?.private?.taskshoot_source === 'true'
        ).length,
      }

      return NextResponse.json({
        calendar_id,
        event_stats: eventStats,
        last_checked: new Date().toISOString(),
      })

    } catch (apiError) {
      console.error('Failed to get calendar details:', apiError)
      return NextResponse.json(
        { error: 'Failed to fetch calendar details' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Get calendar details error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}