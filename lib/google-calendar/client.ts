import { google, calendar_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { 
  GoogleAuthCredentials, 
  GoogleAuthTokens,
  GoogleCalendarAPI,
  CalendarListResponse,
  EventListResponse,
  GoogleCalendarError,
  GOOGLE_CALENDAR_SCOPES
} from '@/types/google-calendar'

/**
 * Google Calendar APIクライアント
 * セキュリティ重視の実装でトークン管理と認証を行う
 */
export class GoogleCalendarClient {
  private oauth2Client: OAuth2Client
  private calendarAPI: GoogleCalendarAPI

  constructor(credentials: GoogleAuthCredentials) {
    this.oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uri
    )

    this.calendarAPI = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    })
  }

  /**
   * OAuth 2.0認証URLを生成
   */
  generateAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [...GOOGLE_CALENDAR_SCOPES],
      include_granted_scopes: true,
      state: state,
      prompt: 'consent', // リフレッシュトークンを確実に取得
    })
  }

  /**
   * 認証コードからトークンを取得
   */
  async getTokenFromCode(code: string): Promise<GoogleAuthTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code)
      
      if (!tokens.access_token) {
        throw new Error('Failed to obtain access token')
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        scope: tokens.scope || '',
        token_type: tokens.token_type || 'Bearer',
        expiry_date: tokens.expiry_date || undefined,
      }
    } catch (error) {
      throw this.createGoogleCalendarError(error, 'Failed to exchange code for tokens')
    }
  }

  /**
   * トークンを設定
   */
  setTokens(tokens: GoogleAuthTokens): void {
    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
    })
  }

  /**
   * トークンの有効性を確認
   */
  async verifyToken(): Promise<boolean> {
    try {
      await this.oauth2Client.getTokenInfo(
        this.oauth2Client.credentials.access_token!
      )
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * トークンをリフレッシュ
   */
  async refreshToken(): Promise<GoogleAuthTokens> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      
      const refreshedTokens: GoogleAuthTokens = {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || undefined,
        scope: credentials.scope || '',
        token_type: credentials.token_type || 'Bearer',
        expiry_date: credentials.expiry_date || undefined,
      }

      return refreshedTokens
    } catch (error) {
      throw this.createGoogleCalendarError(error, 'Failed to refresh access token')
    }
  }

  /**
   * カレンダー一覧を取得
   */
  async getCalendarList(): Promise<CalendarListResponse> {
    try {
      const response = await this.calendarAPI.calendarList.list({
        maxResults: 250,
        showHidden: false,
        showDeleted: false,
      })

      return {
        calendars: response.data.items || [],
        nextPageToken: response.data.nextPageToken || undefined,
      }
    } catch (error) {
      throw this.createGoogleCalendarError(error, 'Failed to fetch calendar list')
    }
  }

  /**
   * 指定されたカレンダーのイベント一覧を取得
   */
  async getEvents(
    calendarId: string,
    timeMin?: Date,
    timeMax?: Date,
    pageToken?: string
  ): Promise<EventListResponse> {
    try {
      const response = await this.calendarAPI.events.list({
        calendarId,
        timeMin: timeMin?.toISOString(),
        timeMax: timeMax?.toISOString(),
        maxResults: 2500,
        singleEvents: true,
        orderBy: 'startTime',
        pageToken,
      })

      return {
        events: response.data.items || [],
        nextPageToken: response.data.nextPageToken || undefined,
        nextSyncToken: response.data.nextSyncToken || undefined,
      }
    } catch (error) {
      throw this.createGoogleCalendarError(error, `Failed to fetch events from calendar ${calendarId}`)
    }
  }

  /**
   * イベントを作成
   */
  async createEvent(
    calendarId: string,
    event: calendar_v3.Schema$Event
  ): Promise<calendar_v3.Schema$Event> {
    try {
      const response = await this.calendarAPI.events.insert({
        calendarId,
        requestBody: event,
      })

      if (!response.data) {
        throw new Error('Failed to create event - no response data')
      }

      return response.data
    } catch (error) {
      throw this.createGoogleCalendarError(error, 'Failed to create event')
    }
  }

  /**
   * イベントを更新
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    event: calendar_v3.Schema$Event
  ): Promise<calendar_v3.Schema$Event> {
    try {
      const response = await this.calendarAPI.events.update({
        calendarId,
        eventId,
        requestBody: event,
      })

      if (!response.data) {
        throw new Error('Failed to update event - no response data')
      }

      return response.data
    } catch (error) {
      throw this.createGoogleCalendarError(error, `Failed to update event ${eventId}`)
    }
  }

  /**
   * イベントを削除
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.calendarAPI.events.delete({
        calendarId,
        eventId,
      })
    } catch (error) {
      throw this.createGoogleCalendarError(error, `Failed to delete event ${eventId}`)
    }
  }

  /**
   * イベントの詳細を取得
   */
  async getEvent(calendarId: string, eventId: string): Promise<calendar_v3.Schema$Event> {
    try {
      const response = await this.calendarAPI.events.get({
        calendarId,
        eventId,
      })

      if (!response.data) {
        throw new Error('Event not found')
      }

      return response.data
    } catch (error) {
      throw this.createGoogleCalendarError(error, `Failed to fetch event ${eventId}`)
    }
  }

  /**
   * 増分同期用のイベント取得
   */
  async getEventsSince(
    calendarId: string,
    syncToken: string
  ): Promise<EventListResponse> {
    try {
      const response = await this.calendarAPI.events.list({
        calendarId,
        syncToken,
        maxResults: 2500,
      })

      return {
        events: response.data.items || [],
        nextPageToken: response.data.nextPageToken || undefined,
        nextSyncToken: response.data.nextSyncToken || undefined,
      }
    } catch (error) {
      // 同期トークンが無効な場合は full sync を実行
      if (this.isInvalidSyncTokenError(error)) {
        return this.getEvents(calendarId)
      }
      throw this.createGoogleCalendarError(error, `Failed to sync events from calendar ${calendarId}`)
    }
  }

  /**
   * 複数のカレンダーからイベントを一括取得
   */
  async getBatchEvents(
    calendarIds: string[],
    timeMin?: Date,
    timeMax?: Date
  ): Promise<Record<string, EventListResponse>> {
    const results: Record<string, EventListResponse> = {}
    
    // 並列処理でAPI呼び出しを最適化
    const promises = calendarIds.map(async (calendarId) => {
      try {
        const events = await this.getEvents(calendarId, timeMin, timeMax)
        return { calendarId, events }
      } catch (error) {
        // 個別のカレンダーでエラーが発生しても他の処理を続行
        console.error(`Failed to fetch events from calendar ${calendarId}:`, error)
        return { calendarId, events: { events: [] } }
      }
    })

    const responses = await Promise.all(promises)
    
    responses.forEach(({ calendarId, events }) => {
      results[calendarId] = events
    })

    return results
  }

  /**
   * レート制限対応付きのリクエスト実行
   */
  /* private async executeWithRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    const MAX_RETRIES = 3
    const BASE_DELAY = 1000 // 1秒

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        if (attempt === MAX_RETRIES) {
          throw error
        }

        // レート制限エラーの場合は指数バックオフで再試行
        if (error?.code === 429 || error?.status === 429) {
          const delay = BASE_DELAY * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        throw error
      }
    }

    throw new Error('Unexpected error in rate limit handling')
  } */

  /**
   * Google Calendar API エラーの統一処理
   */
  private createGoogleCalendarError(error: any, message: string): GoogleCalendarError {
    const gcalError = new Error(message) as GoogleCalendarError
    gcalError.name = 'GoogleCalendarError'
    
    if (error?.response?.data?.error) {
      gcalError.code = error.response.status
      gcalError.errors = error.response.data.error.errors
      gcalError.message = `${message}: ${error.response.data.error.message}`
    } else if (error?.message) {
      gcalError.message = `${message}: ${error.message}`
    }

    return gcalError
  }

  /**
   * 無効な同期トークンエラーかどうかを判定
   */
  private isInvalidSyncTokenError(error: any): boolean {
    return error?.code === 410 || 
           error?.response?.status === 410 ||
           (error?.message && error.message.includes('Sync token'))
  }
}

/**
 * Google Calendar APIクライアントのファクトリー関数
 */
export function createGoogleCalendarClient(credentials: GoogleAuthCredentials): GoogleCalendarClient {
  return new GoogleCalendarClient(credentials)
}

/**
 * 環境変数からGoogle認証情報を取得
 */
export function getGoogleCredentialsFromEnv(): GoogleAuthCredentials {
  const client_id = process.env.GOOGLE_CLIENT_ID
  const client_secret = process.env.GOOGLE_CLIENT_SECRET
  const redirect_uri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google/callback`

  if (!client_id || !client_secret) {
    throw new Error('Google Calendar credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.')
  }

  return {
    client_id,
    client_secret,
    redirect_uri,
  }
}