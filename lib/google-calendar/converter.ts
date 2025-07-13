import { calendar_v3 } from 'googleapis'
import { TaskWithCategory, TaskFormData } from '@/types/tasks'
import { Event as GoogleEvent } from '@/types/google-calendar'
import { addHours, isValid } from 'date-fns'

/**
 * TaskShootタスクをGoogle Calendarイベントに変換
 */
export function taskToGoogleEvent(
  task: TaskWithCategory,
  _calendarId: string
): calendar_v3.Schema$Event {
  const startDate = task.start_date ? new Date(task.start_date) : new Date()
  const dueDate = task.due_date ? new Date(task.due_date) : addHours(startDate, 2)

  // 開始日時と終了日時の検証
  const validStartDate = isValid(startDate) ? startDate : new Date()
  const validDueDate = isValid(dueDate) ? dueDate : addHours(validStartDate, 2)

  // 優先度による色分け設定
  const colorMap = {
    urgent: '11', // 赤
    high: '6',    // オレンジ
    medium: '5',  // 黄
    low: '2',     // 緑
  }

  const event: calendar_v3.Schema$Event = {
    summary: task.title,
    description: createEventDescription(task),
    start: {
      dateTime: validStartDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: validDueDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: colorMap[task.priority] || '1',
    
    // TaskShoot識別用のextendedProperties
    extendedProperties: {
      private: {
        taskshoot_task_id: task.id,
        taskshoot_source: 'true',
        taskshoot_priority: task.priority,
        taskshoot_status: task.status,
        taskshoot_category_id: task.category_id || '',
        taskshoot_estimated_minutes: task.estimated_minutes?.toString() || '',
      },
    },

    // アラート設定（優先度に応じて）
    reminders: createReminders(task.priority),

    // 場所（カテゴリ名を使用）
    location: task.category?.name || undefined,
  }

  // 終日タスクの場合の処理
  if (isAllDayTask(validStartDate, validDueDate)) {
    event.start = {
      date: validStartDate.toISOString().split('T')[0],
    }
    event.end = {
      date: validDueDate.toISOString().split('T')[0],
    }
  }

  return event
}

/**
 * Google CalendarイベントをTaskShootタスクに変換
 */
export function googleEventToTask(
  event: GoogleEvent,
  _userId: string
): TaskFormData {
  const startDate = getEventStartDate(event)
  const endDate = getEventEndDate(event)
  
  // TaskShoot固有のプロパティを抽出
  const extProps = event.extendedProperties?.private || {}
  const isTaskShootEvent = extProps.taskshoot_source === 'true'

  // 推定時間を計算
  const estimatedMinutes = isTaskShootEvent && extProps.taskshoot_estimated_minutes
    ? parseInt(extProps.taskshoot_estimated_minutes, 10)
    : calculateDurationMinutes(startDate, endDate)

  const task: TaskFormData = {
    title: event.summary || 'Untitled Event',
    description: extractDescriptionFromEvent(event),
    priority: isTaskShootEvent 
      ? (extProps.taskshoot_priority as any) || 'medium'
      : inferPriorityFromEvent(event),
    status: isTaskShootEvent
      ? (extProps.taskshoot_status as any) || 'pending'
      : 'pending',
    start_date: startDate.toISOString(),
    due_date: endDate.toISOString(),
    estimated_minutes: estimatedMinutes,
    category_id: isTaskShootEvent && extProps.taskshoot_category_id
      ? extProps.taskshoot_category_id
      : undefined,
    notes: `Google Calendar: ${event.htmlLink || 'N/A'}`,
  }

  return task
}

/**
 * イベントの説明文を作成
 */
function createEventDescription(task: TaskWithCategory): string {
  const parts: string[] = []

  if (task.description) {
    parts.push(task.description)
  }

  // TaskShoot情報を追加
  parts.push('\n--- TaskShoot Information ---')
  parts.push(`Priority: ${task.priority}`)
  parts.push(`Status: ${task.status}`)
  
  if (task.estimated_minutes) {
    const hours = Math.floor(task.estimated_minutes / 60)
    const minutes = task.estimated_minutes % 60
    parts.push(`Estimated: ${hours > 0 ? `${hours}h ` : ''}${minutes}m`)
  }

  if (task.category) {
    parts.push(`Category: ${task.category.name}`)
  }

  if (task.notes) {
    parts.push(`\nNotes: ${task.notes}`)
  }

  parts.push(`\nManaged by TaskShoot Calendar`)

  return parts.join('\n')
}

/**
 * イベントから説明文を抽出（TaskShoot情報を除去）
 */
function extractDescriptionFromEvent(event: GoogleEvent): string {
  if (!event.description) return ''

  // TaskShoot情報セクションを除去
  const description = event.description
  const taskshootSectionIndex = description.indexOf('--- TaskShoot Information ---')
  
  if (taskshootSectionIndex !== -1) {
    return description.substring(0, taskshootSectionIndex).trim()
  }

  return description
}

/**
 * 優先度に応じたリマインダー設定を作成
 */
function createReminders(priority: string): { useDefault: boolean; overrides?: calendar_v3.Schema$EventReminder[] } {
  const reminderMap = {
    urgent: [
      { method: 'popup', minutes: 15 },
      { method: 'popup', minutes: 60 },
    ],
    high: [
      { method: 'popup', minutes: 30 },
    ],
    medium: [
      { method: 'popup', minutes: 60 },
    ],
    low: [],
  }

  return {
    useDefault: false,
    overrides: reminderMap[priority as keyof typeof reminderMap] || reminderMap.medium,
  }
}

/**
 * イベントから優先度を推測
 */
function inferPriorityFromEvent(event: GoogleEvent): 'low' | 'medium' | 'high' | 'urgent' {
  // カラーIDから優先度を推測
  const colorPriorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
    '11': 'urgent', // 赤
    '6': 'high',    // オレンジ
    '5': 'medium',  // 黄
    '2': 'low',     // 緑
  }

  if (event.colorId && colorPriorityMap[event.colorId]) {
    return colorPriorityMap[event.colorId]!
  }

  // タイトルから優先度を推測
  const title = (event.summary || '').toLowerCase()
  if (title.includes('urgent') || title.includes('緊急') || title.includes('!!!')) {
    return 'urgent'
  }
  if (title.includes('high') || title.includes('重要') || title.includes('!!')) {
    return 'high'
  }
  if (title.includes('low') || title.includes('!')) {
    return 'low'
  }

  return 'medium' as const
}

/**
 * イベントの開始日時を取得
 */
function getEventStartDate(event: GoogleEvent): Date {
  if (event.start?.dateTime) {
    return new Date(event.start.dateTime)
  }
  if (event.start?.date) {
    return new Date(event.start.date)
  }
  return new Date()
}

/**
 * イベントの終了日時を取得
 */
function getEventEndDate(event: GoogleEvent): Date {
  if (event.end?.dateTime) {
    return new Date(event.end.dateTime)
  }
  if (event.end?.date) {
    // 終日イベントの場合、終了日は翌日になっているので調整
    const endDate = new Date(event.end.date)
    endDate.setDate(endDate.getDate() - 1)
    endDate.setHours(23, 59, 59, 999)
    return endDate
  }
  
  // フォールバック: 開始日時から2時間後
  const startDate = getEventStartDate(event)
  return addHours(startDate, 2)
}

/**
 * 終日タスクかどうかを判定
 */
function isAllDayTask(startDate: Date, endDate: Date): boolean {
  const diffHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  return diffHours >= 24 && 
         startDate.getHours() === 0 && 
         startDate.getMinutes() === 0 &&
         endDate.getHours() === 23 &&
         endDate.getMinutes() === 59
}

/**
 * 期間から推定時間（分）を計算
 */
function calculateDurationMinutes(startDate: Date, endDate: Date): number {
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  // 最小15分、最大24時間の制限
  return Math.max(15, Math.min(diffMinutes, 24 * 60))
}

/**
 * TaskShootイベントかどうかを判定
 */
export function isTaskShootEvent(event: GoogleEvent): boolean {
  return event.extendedProperties?.private?.taskshoot_source === 'true'
}

/**
 * イベントからTaskShootタスクIDを取得
 */
export function getTaskIdFromEvent(event: GoogleEvent): string | null {
  return event.extendedProperties?.private?.taskshoot_task_id || null
}

/**
 * 同期除外すべきイベントかどうかを判定
 */
export function shouldExcludeFromSync(event: GoogleEvent): boolean {
  // キャンセルされたイベント
  if (event.status === 'cancelled') {
    return true
  }

  // プライベートな予定（visibilityが'private'）
  if (event.visibility === 'private') {
    return true
  }

  // 他のカレンダーアプリの固有イベント（除外パターン）
  const excludePatterns = [
    /^(Birthday|Anniversar(y|ies))/i,
    /^(Holiday|Vacation)/i,
    /^(Meeting|会議).*recurring/i,
  ]

  const summary = event.summary || ''
  return excludePatterns.some(pattern => pattern.test(summary))
}

/**
 * イベントの重複チェック用ハッシュを生成
 */
export function generateEventHash(event: GoogleEvent): string {
  const data = [
    event.summary || '',
    event.start?.dateTime || event.start?.date || '',
    event.end?.dateTime || event.end?.date || '',
    event.location || '',
  ].join('|')

  // 簡易ハッシュ関数
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32bit整数に変換
  }
  return hash.toString(36)
}

/**
 * イベント更新時の差分検出
 */
export function hasEventChanged(
  originalEvent: GoogleEvent,
  updatedEvent: GoogleEvent
): boolean {
  const fieldsToCompare = [
    'summary',
    'description',
    'location',
    'start',
    'end',
    'colorId',
  ]

  return fieldsToCompare.some(field => {
    const original = JSON.stringify((originalEvent as any)[field])
    const updated = JSON.stringify((updatedEvent as any)[field])
    return original !== updated
  })
}