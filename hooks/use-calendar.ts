'use client'

import { useState, useCallback, useMemo } from 'react'
import { View } from 'react-big-calendar'
import { CalendarViewState, CalendarFilters, CalendarEvent, CalendarError } from '@/types/calendar'
import { TaskWithCategory } from '@/types/tasks'
import { taskToCalendarEvent } from '@/lib/calendar/calendar-utils'

interface UseCalendarProps {
  tasks: TaskWithCategory[]
  initialView?: View
  initialDate?: Date
  filters?: CalendarFilters
}

interface UseCalendarReturn {
  // State
  viewState: CalendarViewState
  events: CalendarEvent[]
  filteredEvents: CalendarEvent[]
  loading: boolean
  error: CalendarError | null
  
  // Actions
  setView: (view: View) => void
  setDate: (date: Date) => void
  navigateToDate: (date: Date) => void
  applyFilters: (filters: CalendarFilters) => void
  clearFilters: () => void
  
  // Event handlers
  handleViewChange: (view: View) => void
  handleNavigate: (date: Date) => void
  
  // Utilities
  refreshEvents: () => void
  getEventsForDate: (date: Date) => CalendarEvent[]
  getEventById: (id: string) => CalendarEvent | undefined
}

/**
 * カレンダー機能を管理するカスタムフック
 */
export function useCalendar({
  tasks = [],
  initialView = 'month',
  initialDate = new Date(),
  filters: initialFilters,
}: UseCalendarProps): UseCalendarReturn {
  // State management
  const [viewState, setViewState] = useState<CalendarViewState>({
    date: initialDate,
    view: initialView,
  })
  
  const [currentFilters, setCurrentFilters] = useState<CalendarFilters>(
    initialFilters || {}
  )
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<CalendarError | null>(null)

  // タスクをカレンダーイベントに変換（メモ化）
  const events = useMemo(() => {
    try {
      setError(null)
      
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return []
      }
      
      const convertedEvents = tasks
        .map(taskToCalendarEvent)
        .filter((event): event is CalendarEvent => event !== null)
      
      return convertedEvents
    } catch (err) {
      const calendarError: CalendarError = {
        type: 'LOAD_ERROR',
        message: 'タスクのカレンダーイベント変換中にエラーが発生しました',
        details: err,
      }
      setError(calendarError)
      return []
    }
  }, [tasks])

  // フィルタリング処理（メモ化）
  const filteredEvents = useMemo(() => {
    if (!currentFilters || Object.keys(currentFilters).length === 0) {
      return events
    }

    return events.filter(event => {
      const { priority, status, category, isOverdue } = event.resource
      
      // 優先度フィルター
      if (currentFilters.priorities?.length && !currentFilters.priorities.includes(priority)) {
        return false
      }

      // ステータスフィルター
      if (currentFilters.statuses?.length && !currentFilters.statuses.includes(status)) {
        return false
      }

      // カテゴリフィルター
      if (currentFilters.categories?.length) {
        const categoryId = category?.id
        if (!categoryId || !currentFilters.categories.includes(categoryId)) {
          return false
        }
      }

      // 完了タスク表示設定
      if (currentFilters.showCompleted === false && status === 'completed') {
        return false
      }

      // 期限超過タスク表示設定
      if (currentFilters.showOverdue === false && isOverdue) {
        return false
      }

      return true
    })
  }, [events, currentFilters])

  // Actions
  const setView = useCallback((view: View) => {
    setViewState(prev => ({ ...prev, view }))
  }, [])

  const setDate = useCallback((date: Date) => {
    setViewState(prev => ({ ...prev, date }))
  }, [])

  const navigateToDate = useCallback((date: Date) => {
    setDate(date)
  }, [setDate])

  const applyFilters = useCallback((filters: CalendarFilters) => {
    setCurrentFilters(filters)
  }, [])

  const clearFilters = useCallback(() => {
    setCurrentFilters({})
  }, [])

  // Event handlers
  const handleViewChange = useCallback((view: View) => {
    setView(view)
  }, [setView])

  const handleNavigate = useCallback((date: Date) => {
    setDate(date)
  }, [setDate])

  // Utilities
  const refreshEvents = useCallback(() => {
    setLoading(true)
    // イベント再読み込み処理（将来的にはAPI呼び出し）
    setTimeout(() => {
      setLoading(false)
    }, 100)
  }, [])

  const getEventsForDate = useCallback((date: Date): CalendarEvent[] => {
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start)
      eventDate.setHours(0, 0, 0, 0)
      return eventDate.getTime() === targetDate.getTime()
    })
  }, [filteredEvents])

  const getEventById = useCallback((id: string): CalendarEvent | undefined => {
    return filteredEvents.find(event => event.id === id)
  }, [filteredEvents])

  return {
    // State
    viewState,
    events,
    filteredEvents,
    loading,
    error,
    
    // Actions
    setView,
    setDate,
    navigateToDate,
    applyFilters,
    clearFilters,
    
    // Event handlers
    handleViewChange,
    handleNavigate,
    
    // Utilities
    refreshEvents,
    getEventsForDate,
    getEventById,
  }
}

/**
 * カレンダー統計情報を取得するフック
 */
export function useCalendarStats(events: CalendarEvent[]) {
  return useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay())
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const stats = {
      total: events.length,
      completed: 0,
      overdue: 0,
      upcoming: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
    }

    events.forEach(event => {
      const { status, isOverdue } = event.resource
      const eventDate = new Date(event.start)
      
      // ステータス統計
      if (status === 'completed') {
        stats.completed++
      }
      
      if (isOverdue) {
        stats.overdue++
      }
      
      if (eventDate > now && !isOverdue) {
        stats.upcoming++
      }
      
      // 期間別統計
      if (eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
        stats.today++
      }
      
      if (eventDate >= thisWeekStart) {
        stats.thisWeek++
      }
      
      if (eventDate >= thisMonthStart) {
        stats.thisMonth++
      }
    })

    return stats
  }, [events])
}