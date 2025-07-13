// Google Calendar API型定義
import { calendar_v3 } from 'googleapis'

// Google Calendar APIの基本型をre-export
export type Calendar = calendar_v3.Schema$Calendar
export type CalendarList = calendar_v3.Schema$CalendarList
export type CalendarListEntry = calendar_v3.Schema$CalendarListEntry
export type Event = calendar_v3.Schema$Event
export type EventDateTime = calendar_v3.Schema$EventDateTime
export type EventAttendee = calendar_v3.Schema$EventAttendee
export type EventReminder = calendar_v3.Schema$EventReminder
// export type EventSource = calendar_v3.Schema$EventSource // Not available in current API version

// Google Calendar APIクライアント型
export type GoogleCalendarAPI = calendar_v3.Calendar

// Google認証関連の型
export interface GoogleAuthTokens {
  access_token: string
  refresh_token?: string
  scope: string
  token_type: string
  expiry_date?: number
}

export interface GoogleAuthCredentials {
  client_id: string
  client_secret: string
  redirect_uri: string
}

// Google Calendar連携設定の型
export interface GoogleCalendarConfig {
  enabled: boolean
  access_token?: string
  refresh_token?: string
  selected_calendars: string[] // カレンダーIDの配列
  sync_frequency: 'manual' | '5min' | '15min' | '30min' | '1hour'
  sync_direction: 'both' | 'gcal_to_taskshoot' | 'taskshoot_to_gcal'
  auto_sync_enabled: boolean
  last_sync_at?: string
  sync_status: 'idle' | 'syncing' | 'error' | 'success'
}

// 同期ログの型
export interface SyncLog {
  id: string
  user_id: string
  sync_type: 'manual' | 'automatic'
  direction: 'import' | 'export' | 'bidirectional'
  status: 'success' | 'error' | 'partial'
  started_at: string
  completed_at?: string
  events_processed: number
  events_created: number
  events_updated: number
  events_deleted: number
  errors: SyncError[]
  metadata?: Record<string, any>
}

export interface SyncError {
  type: 'api_error' | 'validation_error' | 'conflict_error' | 'rate_limit'
  message: string
  event_id?: string
  google_event_id?: string
  details?: Record<string, any>
}

// Google Calendarイベント変換用の型
export interface GoogleEventConversion {
  googleEvent: Event
  taskId?: string
  syncStatus: 'pending' | 'synced' | 'conflict'
  lastSyncAt?: string
}

// TaskShoot → Google Calendar変換用の型
export interface TaskEventConversion {
  taskId: string
  googleEventId?: string
  calendarId: string
  syncStatus: 'pending' | 'synced' | 'conflict'
  lastSyncAt?: string
}

// 同期設定のフォームデータ型
export interface GoogleCalendarSyncSettings {
  enabled: boolean
  selectedCalendars: CalendarListEntry[]
  syncFrequency: GoogleCalendarConfig['sync_frequency']
  syncDirection: GoogleCalendarConfig['sync_direction']
  autoSyncEnabled: boolean
}

// Google Calendar APIレスポンス型
export interface CalendarListResponse {
  calendars: CalendarListEntry[]
  nextPageToken?: string
}

export interface EventListResponse {
  events: Event[]
  nextPageToken?: string
  nextSyncToken?: string
}

// 権限スコープの定数
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
] as const

// エラー処理用の型
export interface GoogleCalendarError extends Error {
  code?: number
  errors?: Array<{
    domain: string
    reason: string
    message: string
  }>
}

// 同期状態の型
export interface SyncState {
  isConnected: boolean
  isAuthorized: boolean
  lastSyncAt?: Date
  syncStatus: GoogleCalendarConfig['sync_status']
  errorMessage?: string
  selectedCalendars: CalendarListEntry[]
  syncStats?: {
    totalEvents: number
    syncedEvents: number
    errorCount: number
  }
}

// ウェブフック用の型（将来の拡張用）
export interface GoogleCalendarWebhook {
  id: string
  resourceId: string
  resourceUri: string
  channelId: string
  expiration: number
  token?: string
}

// APIクライアント設定用の型
export interface GoogleCalendarClientConfig {
  credentials: GoogleAuthCredentials
  tokens?: GoogleAuthTokens
  scopes: readonly string[]
}

// 制約と設定の定数
export const GOOGLE_CALENDAR_LIMITS = {
  MAX_EVENTS_PER_REQUEST: 2500,
  MAX_CALENDARS_PER_USER: 100,
  RATE_LIMIT_REQUESTS_PER_SECOND: 10,
  SYNC_BATCH_SIZE: 50,
} as const

// デフォルト設定
export const DEFAULT_GOOGLE_CALENDAR_CONFIG: Partial<GoogleCalendarConfig> = {
  enabled: false,
  selected_calendars: [],
  sync_frequency: '15min',
  sync_direction: 'both',
  auto_sync_enabled: true,
  sync_status: 'idle',
} as const