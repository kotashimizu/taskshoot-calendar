import { Event, View } from 'react-big-calendar'
import { Task, TaskWithCategory, TaskPriority, TaskStatus, Category } from './tasks'

// React-Big-Calendar拡張イベント型
export interface CalendarEvent extends Event {
  readonly id: string
  readonly title: string
  readonly start: Date
  readonly end: Date
  readonly allDay?: boolean
  readonly resource: CalendarEventResource
}

// カレンダーイベントリソース型
export interface CalendarEventResource {
  readonly taskId: string
  readonly task: TaskWithCategory
  readonly priority: TaskPriority
  readonly status: TaskStatus
  readonly category?: Category
  readonly estimatedMinutes?: number
  readonly notes?: string
  readonly isOverdue?: boolean
  readonly completionRate?: number
}

// カレンダービュー設定
export interface CalendarViewState {
  date: Date
  view: View
}

// 色設定の基本型
export interface ColorScheme {
  readonly background: string
  readonly border: string
  readonly text: string
}

// カレンダー表示設定
export interface CalendarSettings {
  readonly defaultView: View
  readonly startOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=Sunday, 1=Monday, etc.
  readonly timeZone: string
  readonly showWeekends: boolean
  readonly showAllDay: boolean
  readonly workingHours: {
    readonly start: number // 0-23
    readonly end: number   // 0-23
  }
  readonly eventColors: {
    readonly [key in TaskPriority]: ColorScheme
  }
  readonly statusColors: {
    readonly [key in TaskStatus]: ColorScheme
  }
  readonly theme: 'light' | 'dark' | 'auto'
}

// カレンダーイベント作成用の型
export interface CreateEventFromCalendar {
  date: Date
  allDay?: boolean
  startTime?: Date
  endTime?: Date
}

// カレンダーフィルター設定
export interface CalendarFilters {
  priorities?: TaskPriority[]
  statuses?: TaskStatus[]
  categories?: string[]
  showCompleted?: boolean
  showOverdue?: boolean
}

// ドラッグ&ドロップイベント情報
export interface DragDropEvent {
  event: CalendarEvent
  start: Date
  end: Date
  isAllDay?: boolean
}

// 日付範囲
export interface DateRange {
  start: Date
  end: Date
}

// カレンダーユーティリティ関数の戻り値型
export interface CalendarEventMap {
  [date: string]: CalendarEvent[]
}

// 週間ビューの設定
export interface WeekSettings {
  startTime: number // 時間（0-23）
  endTime: number   // 時間（0-23）
  showTimeGutter: boolean
  timeSlotDuration: number // 分単位
}

// カレンダーエラー型
export interface CalendarError {
  type: 'LOAD_ERROR' | 'SAVE_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR'
  message: string
  details?: unknown
}

// カレンダー統計情報
export interface CalendarStats {
  totalEvents: number
  completedEvents: number
  overdueEvents: number
  upcomingEvents: number
  eventsThisWeek: number
  eventsThisMonth: number
}

// カレンダーコンポーネントのプロパティ型
export interface CalendarComponentProps {
  events: CalendarEvent[]
  loading?: boolean
  error?: CalendarError | null
  onEventSelect?: (event: CalendarEvent) => void
  onEventCreate?: (eventData: CreateEventFromCalendar) => void
  onEventUpdate?: (event: CalendarEvent, changes: Partial<CalendarEvent>) => void
  onEventDelete?: (eventId: string) => void
  onViewChange?: (view: View) => void
  onNavigate?: (date: Date) => void
  settings?: Partial<CalendarSettings>
  filters?: CalendarFilters
  className?: string
}

// カレンダーツールバーのプロパティ型
export interface CalendarToolbarProps {
  date: Date
  view: View
  views: View[]
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY' | 'DATE', date?: Date) => void
  onView: (view: View) => void
  localizer: any // react-big-calendarのLocalizer型
}

// カレンダーイベントポップアップのプロパティ型
export interface EventPopupProps {
  event: CalendarEvent
  isOpen: boolean
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
  onDelete: (eventId: string) => void
  anchorEl?: HTMLElement | null
}

// クイック追加モーダルのプロパティ型
export interface QuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date
  onSubmit: (taskData: Partial<Task>) => void
}

// React-Big-Calendarのカスタマイズ用プロパティ
export interface CustomCalendarProps {
  events: CalendarEvent[]
  localizer: any
  defaultView?: View
  views?: View[]
  step?: number
  timeslots?: number
  min?: Date
  max?: Date
  scrollToTime?: Date
  dayLayoutAlgorithm?: string
  showMultiDayTimes?: boolean
  onSelectEvent?: (event: CalendarEvent) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[] }) => void
  onNavigate?: (date: Date) => void
  onView?: (view: View) => void
  eventPropGetter?: (event: CalendarEvent) => {
    className?: string
    style?: React.CSSProperties
  }
  dayPropGetter?: (date: Date) => {
    className?: string
    style?: React.CSSProperties
  }
  slotPropGetter?: (date: Date) => {
    className?: string
    style?: React.CSSProperties
  }
}

// 型安全なイベント変換関数の型
export type TaskToEventConverter = (task: TaskWithCategory) => CalendarEvent | null
export type EventToTaskConverter = (event: CalendarEvent) => Partial<Task>

// カレンダーフック用の戻り値型
export interface UseCalendarReturn {
  events: CalendarEvent[]
  viewState: CalendarViewState
  loading: boolean
  error: CalendarError | null
  setView: (view: View) => void
  setDate: (date: Date) => void
  navigateToDate: (date: Date) => void
  createEvent: (eventData: CreateEventFromCalendar) => Promise<void>
  updateEvent: (event: CalendarEvent, changes: Partial<CalendarEvent>) => Promise<void>
  deleteEvent: (eventId: string) => Promise<void>
  refetch: () => Promise<void>
}