'use client'

import { useState, useCallback, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View, Event } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { CalendarEvent, CalendarViewState, CalendarComponentProps } from '@/types/calendar'
import { getEventDisplayProps, taskToCalendarEvent } from '@/lib/calendar/calendar-utils'
import { TaskWithCategory, TaskFormData } from '@/types/tasks'
import { TaskDetailModal } from './task-detail-modal'
import { TaskCreateModal } from './task-create-modal'
import { CalendarToolbar } from './calendar-toolbar'

// react-big-calendarのスタイルをインポート
import 'react-big-calendar/lib/css/react-big-calendar.css'

// date-fnsローカライザーの設定
const locales = {
  ja: ja,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // 月曜始まり
  getDay,
  locales,
})

interface CalendarViewProps extends Omit<CalendarComponentProps, 'events'> {
  tasks: TaskWithCategory[]
  onTaskUpdate?: (taskId: string, data: Partial<TaskWithCategory>) => Promise<void>
  onTaskDelete?: (taskId: string) => Promise<void>
  onTaskCreate?: (data: TaskFormData) => Promise<void>
}

/* eslint-disable no-unused-vars */
export function CalendarView({
  tasks = [],
  loading = false,
  error = null,
  onEventSelect,
  onEventCreate,
  onEventUpdate: _onEventUpdate,
  onEventDelete: _onEventDelete,
  onViewChange,
  onNavigate,
  settings,
  filters,
  className = '',
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
}: CalendarViewProps) {
  // ビュー状態管理
  const [viewState, setViewState] = useState<CalendarViewState>({
    date: new Date(),
    view: (settings?.defaultView as View) || 'month',
  })

  // タスク詳細モーダル状態
  const [selectedTask, setSelectedTask] = useState<TaskWithCategory | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  
  // タスク作成モーダル状態
  const [createModalData, setCreateModalData] = useState<{
    date: Date
    allDay: boolean
    startTime?: Date
    endTime?: Date
  } | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // タスクをカレンダーイベントに変換（メモ化）
  const events = useMemo(() => {
    return tasks
      .map(task => taskToCalendarEvent(task))
      .filter((event): event is CalendarEvent => event !== null)
  }, [tasks])

  // フィルタリングされたイベント
  const filteredEvents = useMemo(() => {
    if (!filters) return events

    return events.filter(event => {
      // 優先度フィルター
      if (filters.priorities && filters.priorities.length > 0) {
        if (!filters.priorities.includes(event.resource.priority)) {
          return false
        }
      }

      // ステータスフィルター
      if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(event.resource.status)) {
          return false
        }
      }

      // カテゴリフィルター
      if (filters.categories && filters.categories.length > 0) {
        const categoryId = event.resource.category?.id
        if (!categoryId || !filters.categories.includes(categoryId)) {
          return false
        }
      }

      // 完了タスク表示設定
      if (filters.showCompleted === false && event.resource.status === 'completed') {
        return false
      }

      return true
    })
  }, [events, filters])

  // イベント選択ハンドラー
  const handleSelectEvent = useCallback((event: Event) => {
    if ('resource' in event) {
      const calendarEvent = event as CalendarEvent
      setSelectedTask(calendarEvent.resource.task)
      setIsDetailModalOpen(true)
      onEventSelect?.(calendarEvent)
    }
  }, [onEventSelect])

  // スロット選択ハンドラー（カレンダーの空白部分クリック）
  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date; slots: Date[] }) => {
    // タスク作成モーダルを開く
    setCreateModalData({
      date: slotInfo.start,
      allDay: slotInfo.slots.length > 1,
      startTime: slotInfo.start,
      endTime: slotInfo.end,
    })
    setIsCreateModalOpen(true)
    
    // 既存のコールバックも実行
    onEventCreate?.({
      date: slotInfo.start,
      allDay: slotInfo.slots.length > 1,
      startTime: slotInfo.start,
      endTime: slotInfo.end,
    })
  }, [onEventCreate])

  // ナビゲーションハンドラー
  const handleNavigate = useCallback((date: Date) => {
    setViewState(prev => ({ ...prev, date }))
    onNavigate?.(date)
  }, [onNavigate])

  // ビュー変更ハンドラー
  const handleViewChange = useCallback((view: View) => {
    setViewState(prev => ({ ...prev, view }))
    onViewChange?.(view)
  }, [onViewChange])

  // イベント表示プロパティの取得
  const eventPropGetter = useCallback((event: Event) => {
    if ('resource' in event) {
      return getEventDisplayProps(event as CalendarEvent)
    }
    return {}
  }, [])

  // Future enhancement: Drag & drop and resize functionality
  // これらの機能は次フェーズで実装予定
  // - handleEventDrop: ドラッグ&ドロップによる日程変更
  // - handleEventResize: リサイズによる期間変更
  // - onEventEdit: インライン編集機能

  // カスタムツールバーコンポーネント（最適化されたメモ化）
  const CustomToolbar = useCallback(({ label, onNavigate, onView }: any) => (
    <CalendarToolbar
      label={label}
      onNavigate={onNavigate}
      onView={onView}
      currentView={viewState.view}
    />
  ), [viewState.view])

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-2">カレンダーの読み込みでエラーが発生しました</p>
          <p className="text-sm text-gray-600">{error.message}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="calendar-container" style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          allDayAccessor="allDay"
          resourceAccessor="resource"
          view={viewState.view}
          date={viewState.date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          popup
          scrollToTime={new Date(1970, 1, 1, 9)}
          defaultView="month"
          views={['month', 'week', 'day']}
          step={30}
          timeslots={2}
          eventPropGetter={eventPropGetter}
          components={{
            toolbar: CustomToolbar,
          }}
          messages={{
            allDay: '終日',
            previous: '前',
            next: '次',
            today: '今日',
            month: '月',
            week: '週',
            day: '日',
            agenda: 'アジェンダ',
            date: '日付',
            time: '時刻',
            event: 'イベント',
            noEventsInRange: 'この期間にイベントはありません',
            showMore: (total: number) => `他 ${total} 件`,
          }}
          formats={{
            dateFormat: 'd',
            dayFormat: (date: Date, culture?: string, localizer?: any) =>
              localizer.format(date, 'EEE d/M', culture),
            weekdayFormat: (date: Date, culture?: string, localizer?: any) =>
              localizer.format(date, 'EEE', culture),
            monthHeaderFormat: (date: Date, culture?: string, localizer?: any) =>
              localizer.format(date, 'yyyy年M月', culture),
            dayHeaderFormat: (date: Date, culture?: string, localizer?: any) =>
              localizer.format(date, 'M月d日 (EEE)', culture),
            dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) =>
              `${localizer.format(start, 'M月d日', culture)} - ${localizer.format(end, 'M月d日', culture)}`,
          }}
          // アクセシビリティ対応は内部で適切に処理される
        />
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">読み込み中...</p>
          </div>
        </div>
      )}

      {/* タスク詳細モーダル */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedTask(null)
        }}
        onEdit={(task) => {
          // TODO: タスク編集フォームを開く実装
          // 将来的にタスク編集モーダルまたはフォームを実装
          void task
        }}
        onDelete={async (taskId) => {
          if (onTaskDelete) {
            await onTaskDelete(taskId)
          }
        }}
        onStatusChange={async (taskId, status) => {
          if (onTaskUpdate) {
            await onTaskUpdate(taskId, { status })
          }
        }}
      />

      {/* タスク作成モーダル */}
      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateModalData(null)
        }}
        onSubmit={async (data) => {
          if (onTaskCreate) {
            await onTaskCreate(data)
          }
        }}
        initialData={createModalData || undefined}
      />
    </Card>
  )
}