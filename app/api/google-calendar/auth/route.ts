import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleCredentialsFromEnv, createGoogleCalendarClient } from '@/lib/google-calendar/client'
import { GoogleCalendarConfig } from '@/types/google-calendar'
import { createSafeErrorResponse } from '@/lib/security'
import { authRateLimiter, getUserIdentifier } from '@/lib/rate-limiter'

/**
 * Google Calendar OAuth認証URLを取得
 */
export async function GET() {
  try {
    const supabase = createClient()
    
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      const { response, statusCode } = createSafeErrorResponse(
        authError,
        'Authentication required',
        401
      )
      return NextResponse.json(response, { status: statusCode })
    }

    // レート制限チェック
    const rateLimitResult = authRateLimiter.check(getUserIdentifier(user.id))
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.resetTime ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString() : '60',
          }
        }
      )
    }

    // Google認証情報を取得
    const credentials = getGoogleCredentialsFromEnv()
    const client = createGoogleCalendarClient(credentials)

    // 状態パラメータにユーザーIDを含める（セキュリティ対策）
    // CSRFトークンとしてランダムな値を追加
    const csrfToken = crypto.randomUUID()
    const state = JSON.stringify({
      user_id: user.id,
      timestamp: Date.now(),
      csrf_token: csrfToken,
      nonce: crypto.randomUUID(), // 追加のランダム性
    })

    // OAuth認証URLを生成
    const authUrl = client.generateAuthUrl(state)

    return NextResponse.json({
      auth_url: authUrl,
      state,
    })

  } catch (error) {
    const { response, statusCode } = createSafeErrorResponse(
      error,
      'Failed to generate authentication URL'
    )
    return NextResponse.json(response, { status: statusCode })
  }
}

/**
 * Google Calendar OAuth認証コールバック処理
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストサイズ制限チェック
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10000) { // 10KB制限
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      )
    }

    const body = await request.json()
    const { code, state } = body

    // 入力値の厳密な検証
    if (!code || typeof code !== 'string' || code.length > 1000) {
      return NextResponse.json(
        { error: 'Invalid authorization code' },
        { status: 400 }
      )
    }

    if (!state || typeof state !== 'string' || state.length > 2000) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      )
    }

    // 状態パラメータを検証
    let stateData
    try {
      stateData = JSON.parse(state)
    } catch {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== stateData.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized or state mismatch' },
        { status: 401 }
      )
    }

    // タイムスタンプ検証（5分以内に短縮でセキュリティ強化）
    const now = Date.now()
    const stateTimestamp = stateData.timestamp
    if (now - stateTimestamp > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: 'State parameter expired' },
        { status: 400 }
      )
    }

    // CSRFトークンとnonceの存在確認
    if (!stateData.csrf_token || !stateData.nonce) {
      return NextResponse.json(
        { error: 'Invalid state parameter format' },
        { status: 400 }
      )
    }

    // Google認証情報を取得
    const credentials = getGoogleCredentialsFromEnv()
    const client = createGoogleCalendarClient(credentials)

    // 認証コードからトークンを取得
    const tokens = await client.getTokenFromCode(code)

    // トークンをクライアントに設定して検証
    client.setTokens(tokens)
    const isValid = await client.verifyToken()

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid tokens received' },
        { status: 400 }
      )
    }

    // データベースに設定を保存（トランザクション使用）
    const configData: Partial<GoogleCalendarConfig> = {
      enabled: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      sync_status: 'idle',
      last_sync_at: new Date().toISOString(),
    }

    const { data: config, error: configError } = await supabase
      .from('google_calendar_configs')
      .upsert({
        user_id: user.id,
        ...configData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (configError) {
      const { response, statusCode } = createSafeErrorResponse(
        configError,
        'Failed to save configuration'
      )
      return NextResponse.json(response, { status: statusCode })
    }

    // カレンダー一覧を取得して設定に含める
    try {
      const calendars = await client.getCalendarList()
      
      await supabase
        .from('google_calendar_configs')
        .update({
          selected_calendars: calendars.calendars.map(cal => cal.id).slice(0, 5), // 最初の5つを選択
        })
        .eq('user_id', user.id)

      return NextResponse.json({
        success: true,
        config: config,
        calendars: calendars.calendars,
      })
    } catch (calendarError) {
      console.error('Calendar list fetch error:', calendarError)
      
      // カレンダー取得に失敗しても認証は成功として扱う
      return NextResponse.json({
        success: true,
        config: config,
        calendars: [],
        warning: 'Authentication successful but failed to fetch calendars',
      })
    }

  } catch (error) {
    console.error('Google Calendar auth callback error:', error)
    
    // Google APIエラーの詳細をログに記録
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Google API Error Code:', error.code)
      console.error('Google API Error Details:', error)
    }

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

/**
 * Google Calendar認証状態の取得
 */
export async function DELETE() {
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

    // Google Calendar設定を削除
    const { error: deleteError } = await supabase
      .from('google_calendar_configs')
      .update({
        enabled: false,
        access_token: null,
        refresh_token: null,
        selected_calendars: [],
        sync_status: 'idle',
      })
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Failed to disconnect Google Calendar:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
    })

  } catch (error) {
    console.error('Google Calendar disconnect error:', error)
    return NextResponse.json(
      { error: 'Disconnect failed' },
      { status: 500 }
    )
  }
}