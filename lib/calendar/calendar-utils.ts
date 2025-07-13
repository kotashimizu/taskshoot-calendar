import { format, startOfDay, endOfDay, addDays, addHours, isValid } from 'date-fns'
import { TaskWithCategory, TaskPriority, TaskStatus } from '@/types/tasks'
import { CalendarEvent, CalendarEventMap, DateRange, ColorScheme } from '@/types/calendar'

// エラーメッセージ定数
const ERROR_MESSAGES = {
  INVALID_TASK_DATA: 'Invalid task data: missing required fields',
  INVALID_DATE: 'Invalid date provided',
  CONVERSION_ERROR: 'Error during task-to-event conversion',
} as const

/**
 * タスクの基本検証
 */
function validateTask(task: TaskWithCategory): boolean {
  return Boolean(task?.id && task?.title && typeof task.id === 'string' && typeof task.title === 'string')
}

/**
 * 日付の安全なパース
 */
function parseTaskDate(dateValue: string | Date | null | undefined): Date | null {
  if (!dateValue) return null
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
    return isValid(date) ? date : null
  } catch {
    return null
  }
}

/**
 * タスクをカレンダーイベントに安全に変換
 */
export function taskToCalendarEvent(task: TaskWithCategory): CalendarEvent | null {
  try {
    // 必須フィールドの検証
    if (!validateTask(task)) {
      return null
    }

    // 日付情報の処理
    const { start, end, allDay } = calculateEventDates(task)
    
    if (!start || !end) {
      return null
    }

    // 期限超過チェック
    const now = new Date()
    const isOverdue = task.status !== 'completed' && task.status !== 'cancelled' && end < now

    const calendarEvent: CalendarEvent = {
      id: task.id,
      title: task.title,
      start,
      end,
      allDay,
      resource: {
        taskId: task.id,
        task,
        priority: task.priority,
        status: task.status,
        category: task.category || undefined,
        estimatedMinutes: task.estimated_minutes || undefined,
        notes: task.notes || undefined,
        isOverdue,
        completionRate: calculateCompletionRate(task),
      }
    }

    return calendarEvent
  } catch (error) {
    // エラー情報をログに記録（本番環境ではログサービスに送信）
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(ERROR_MESSAGES.CONVERSION_ERROR, { task, error })
    }
    return null
  }
}

/**
 * タスクの日付情報からイベントの開始・終了日を計算
 */
function calculateEventDates(task: TaskWithCategory): {
  start: Date | null
  end: Date | null
  allDay: boolean
} {
  const startDate = parseTaskDate(task.start_date)
  const dueDate = parseTaskDate(task.due_date)
  const estimatedMinutes = task.estimated_minutes || 60

  if (startDate) {
    // 開始日が指定されている場合
    const endDate = dueDate && isValid(dueDate) 
      ? dueDate 
      : addHours(startDate, estimatedMinutes / 60)
    
    return {
      start: startDate,
      end: endDate,
      allDay: false
    }
  } else if (dueDate) {
    // 期限のみ指定されている場合
    return {
      start: startOfDay(dueDate),
      end: endOfDay(dueDate),
      allDay: true
    }
  } else {
    // 日付が指定されていない場合
    const today = new Date()
    return {
      start: startOfDay(today),
      end: endOfDay(today),
      allDay: true
    }
  }
}

/**
 * タスクの完了率を計算（将来の機能拡張用）
 */
function calculateCompletionRate(task: TaskWithCategory): number {
  switch (task.status) {
    case 'completed':
      return 100
    case 'in_progress':
      return 50 // デフォルトでは50%、将来的に細かい進捗管理を実装
    case 'cancelled':
      return 0
    default:
      return 0
  }
}

/**
 * カレンダーイベントをタスクデータに変換
 */
export function calendarEventToTaskUpdate(event: CalendarEvent): Partial<TaskWithCategory> {
  try {
    const updates: Partial<TaskWithCategory> = {
      title: event.title,
    }

    // 日時の更新
    if (event.allDay) {
      updates.due_date = event.start.toISOString()
      updates.start_date = undefined
    } else {
      updates.start_date = event.start.toISOString()
      updates.due_date = event.end.toISOString()
      
      // 見積時間の計算
      const durationMs = event.end.getTime() - event.start.getTime()
      updates.estimated_minutes = Math.round(durationMs / (1000 * 60))
    }

    return updates
  } catch (error) {
    // Error converting calendar event to task update - returning empty object
    return {}
  }
}

/**
 * 日付範囲内のイベントを取得
 */
export function getEventsInRange(
  events: CalendarEvent[], 
  range: DateRange
): CalendarEvent[] {
  return events.filter(event => {
    const eventStart = event.start.getTime()
    const eventEnd = event.end.getTime()
    const rangeStart = range.start.getTime()
    const rangeEnd = range.end.getTime()

    // イベントが範囲と重複するかチェック
    return eventStart < rangeEnd && eventEnd > rangeStart
  })
}

/**
 * イベントを日付別にグループ化
 */
export function groupEventsByDate(events: CalendarEvent[]): CalendarEventMap {
  const grouped: CalendarEventMap = {}

  events.forEach(event => {
    const dateKey = format(event.start, 'yyyy-MM-dd')
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    
    grouped[dateKey].push(event)
  })

  return grouped
}

// カラーパレット定数
const COLOR_PALETTE = {
  priority: {
    low: { background: '#E6F7FF', border: '#91D5FF', text: '#0958D9' },
    medium: { background: '#FFF7E6', border: '#FFD666', text: '#D46B08' },
    high: { background: '#FFF2E8', border: '#FFBB96', text: '#D4380D' },
    urgent: { background: '#FFF1F0', border: '#FFCCC7', text: '#CF1322' },
  },
  status: {
    pending: { background: '#F6F6F6', border: '#D9D9D9', text: '#8C8C8C' },
    in_progress: { background: '#E6F7FF', border: '#91D5FF', text: '#0958D9' },
    completed: { background: '#F6FFED', border: '#B7EB8F', text: '#389E0D' },
    cancelled: { background: '#FFF1F0', border: '#FFCCC7', text: '#CF1322' },
  },
  theme: {
    overdue: { background: '#FFEBE6', border: '#FF7875', text: '#A8071A' },
  }
} as const satisfies {
  priority: Record<TaskPriority, ColorScheme>
  status: Record<TaskStatus, ColorScheme>
  theme: Record<string, ColorScheme>
}

/**
 * 優先度に基づく色の取得
 */
export function getPriorityColor(priority: TaskPriority): ColorScheme {
  return COLOR_PALETTE.priority[priority] || COLOR_PALETTE.priority.medium
}

/**
 * ステータスに基づく色の取得
 */
export function getStatusColor(status: TaskStatus): ColorScheme {
  return COLOR_PALETTE.status[status] || COLOR_PALETTE.status.pending
}

/**
 * イベントの表示プロパティを取得
 */
export function getEventDisplayProps(event: CalendarEvent): {
  className: string
  style: React.CSSProperties
} {
  const { priority, status, isOverdue } = event.resource
  
  // 色の優先順位: 期限超過 > 完了 > 優先度
  let displayColor: ColorScheme
  if (isOverdue && status !== 'completed' && status !== 'cancelled') {
    displayColor = COLOR_PALETTE.theme.overdue
  } else if (status === 'completed' || status === 'cancelled') {
    displayColor = getStatusColor(status)
  } else {
    displayColor = getPriorityColor(priority)
  }

  const baseClassName = 'calendar-event'
  const modifierClasses = [
    `priority-${priority}`,
    `status-${status}`,
    isOverdue ? 'overdue' : '',
  ].filter(Boolean).join(' ')

  return {
    className: `${baseClassName} ${modifierClasses}`,
    style: {
      backgroundColor: displayColor.background,
      borderLeft: `4px solid ${displayColor.border}`,
      color: displayColor.text,
      opacity: status === 'completed' ? 0.7 : 1,
      textDecoration: status === 'completed' ? 'line-through' : 'none',
      fontWeight: priority === 'urgent' ? 'bold' : 'normal',
      ...(isOverdue && status !== 'completed' && {
        animation: 'pulse 2s infinite',
      }),
    }
  }
}

/**
 * 期限超過タスクの検出（改善版）
 */
export function isEventOverdue(event: CalendarEvent): boolean {
  return event.resource.isOverdue || false
}

/**
 * 今日のイベントを取得
 */
export function getTodayEvents(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)

  return getEventsInRange(events, {
    start: startOfToday,
    end: endOfToday,
  })
}

/**
 * 今週のイベントを取得
 */
export function getThisWeekEvents(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date()
  const startOfWeek = startOfDay(addDays(today, -today.getDay()))
  const endOfWeek = endOfDay(addDays(startOfWeek, 6))

  return getEventsInRange(events, {
    start: startOfWeek,
    end: endOfWeek,
  })
}

/**
 * 安全な日付パース
 */
export function safeDateParse(dateString: string | Date | null | undefined): Date | null {
  if (!dateString) return null

  try {
    if (dateString instanceof Date) {
      return isValid(dateString) ? dateString : null
    }

    const parsed = new Date(dateString)
    return isValid(parsed) ? parsed : null
  } catch (error) {
    // Failed to parse date - returning null
    return null
  }
}

/**
 * 日付文字列を安全にフォーマット
 */
export function safeFormatDate(
  date: Date | string | null | undefined, 
  formatStr: string = 'yyyy-MM-dd'
): string {
  const parsedDate = typeof date === 'string' ? safeDateParse(date) : date

  if (!parsedDate || !isValid(parsedDate)) {
    return ''
  }

  try {
    return format(parsedDate, formatStr)
  } catch (error) {
    // Failed to format date - returning empty string
    return ''
  }
}

/**
 * カレンダービューの日付範囲を計算
 */
export function getViewDateRange(date: Date, view: string): DateRange {
  switch (view) {
    case 'month':
      // 月の表示範囲（カレンダーグリッド全体）
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      
      // 週の開始日（日曜日）から週の終了日（土曜日）まで
      const startOfCalendar = addDays(firstDayOfMonth, -firstDayOfMonth.getDay())
      const endOfCalendar = addDays(lastDayOfMonth, 6 - lastDayOfMonth.getDay())
      
      return {
        start: startOfDay(startOfCalendar),
        end: endOfDay(endOfCalendar),
      }

    case 'week':
      // 週の表示範囲
      const startOfWeek = addDays(date, -date.getDay())
      const endOfWeek = addDays(startOfWeek, 6)
      
      return {
        start: startOfDay(startOfWeek),
        end: endOfDay(endOfWeek),
      }

    case 'day':
      // 日の表示範囲
      return {
        start: startOfDay(date),
        end: endOfDay(date),
      }

    default:
      // デフォルトは月表示
      return getViewDateRange(date, 'month')
  }
}