'use client'

import { memo } from 'react'
import { View } from 'react-big-calendar'

interface CalendarToolbarProps {
  label: string
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onView: (view: View) => void
  currentView: View
}

export const CalendarToolbar = memo(function CalendarToolbar({
  label,
  onNavigate,
  onView,
  currentView,
}: CalendarToolbarProps) {
  return (
    <div className="rbc-toolbar" role="toolbar" aria-label="カレンダーナビゲーション">
      <span className="rbc-btn-group">
        <button
          type="button"
          onClick={() => onNavigate('PREV')}
          className="rbc-btn"
          aria-label="前へ"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => onNavigate('TODAY')}
          className="rbc-btn"
        >
          今日
        </button>
        <button
          type="button"
          onClick={() => onNavigate('NEXT')}
          className="rbc-btn"
          aria-label="次へ"
        >
          ›
        </button>
      </span>
      <span className="rbc-toolbar-label">{label}</span>
      <span className="rbc-btn-group">
        <button
          type="button"
          className={currentView === 'month' ? 'rbc-btn rbc-active' : 'rbc-btn'}
          onClick={() => onView('month')}
        >
          月
        </button>
        <button
          type="button"
          className={currentView === 'week' ? 'rbc-btn rbc-active' : 'rbc-btn'}
          onClick={() => onView('week')}
        >
          週
        </button>
        <button
          type="button"
          className={currentView === 'day' ? 'rbc-btn rbc-active' : 'rbc-btn'}
          onClick={() => onView('day')}
        >
          日
        </button>
      </span>
    </div>
  )
})