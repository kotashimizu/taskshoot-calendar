'use client'

/**
 * TaskShoot 日次タイムラインカレンダー
 * - 時刻軸表示（00:00-24:00）
 * - タスクブロック配置
 * - 色分けされたタイムスロット
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Task } from '@/types/tasks'

interface ScheduledTask extends Task {
  start_time?: string
  end_time?: string
}

interface TimeSlot {
  hour: number
  minute: number
  timeString: string
  tasks: ScheduledTask[]
  color: 'blue' | 'green' | 'yellow' | 'gray'
}

interface DailyTimelineCalendarProps {
  tasks?: Task[]
  className?: string
  onTaskSchedule?: (taskId: string, startTime: string) => void
}

export function DailyTimelineCalendar({ 
  tasks: propTasks = [], 
  className,
  onTaskSchedule 
}: DailyTimelineCalendarProps) {
  const [tasks] = useState<ScheduledTask[]>(propTasks as ScheduledTask[])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)

  // 時刻スロット生成
  useEffect(() => {
    const slots: TimeSlot[] = []
    
    // 00:00から23:00まで1時間ごと
    for (let hour = 0; hour < 24; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`
      
      // 時間帯に応じた色分け
      let color: 'blue' | 'green' | 'yellow' | 'gray' = 'gray'
      if (hour >= 0 && hour < 8) {
        color = 'blue'  // 早朝（0-8時）
      } else if (hour >= 8 && hour < 12) {
        color = 'green' // 午前（8-12時）
      } else if (hour >= 12 && hour < 18) {
        color = 'yellow' // 午後（12-18時）
      } else {
        color = 'gray'  // 夜間（18-24時）
      }

      slots.push({
        hour,
        minute: 0,
        timeString,
        tasks: [],
        color
      })
    }

    // タスクを適切な時間スロットに配置
    tasks.forEach(task => {
      if (task.start_date) {
        const startDate = new Date(task.start_date)
        const taskHour = startDate.getHours()
        
        // 今日のタスクのみを表示
        const today = new Date()
        const isToday = startDate.getDate() === today.getDate() &&
                       startDate.getMonth() === today.getMonth() &&
                       startDate.getFullYear() === today.getFullYear()
        
        if (isToday) {
          const slot = slots.find(s => s.hour === taskHour)
          if (slot) {
            slot.tasks.push(task as ScheduledTask)
          }
        }
      }
    })

    // 優先度順にソート（高優先度が上に）
    slots.forEach(slot => {
      slot.tasks.sort((a, b) => {
        const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 }
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
               (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
      })
    })

    setTimeSlots(slots)
  }, [tasks])

  const getSlotBgColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 border-blue-200'
      case 'green':
        return 'bg-green-100 border-green-200'
      case 'yellow':
        return 'bg-yellow-100 border-yellow-200'
      default:
        return 'bg-gray-100 border-gray-200'
    }
  }

  const getTaskBgColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500 text-white'
      case 'medium':
        return 'bg-blue-500 text-white'
      case 'low':
        return 'bg-green-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  // ドラッグアンドドロップハンドラー
  const handleDragOver = (e: React.DragEvent, timeString: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSlot(timeString)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverSlot(null)
  }

  const handleDrop = (e: React.DragEvent, timeString: string) => {
    e.preventDefault()
    setDragOverSlot(null)
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'))
      if (dragData && dragData.id && onTaskSchedule) {
        onTaskSchedule(dragData.id, timeString)
      }
    } catch (error) {
      console.error('ドロップエラー:', error)
    }
  }

  const getCurrentTimeIndicator = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // 現在時刻に赤いラインを表示
    const topPosition = (currentHour * 60 + currentMinute) * (64 / 60) // 64pxが1時間の高さ
    
    return (
      <div 
        className="absolute left-0 right-0 border-t-2 border-red-500 z-10"
        style={{ top: `${topPosition}px` }}
      >
        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-r absolute -left-1">
          {now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          日次タイムライン
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative">
          {/* 現在時刻インジケーター */}
          {getCurrentTimeIndicator()}
          
          {/* タイムスロット */}
          <div className="space-y-0">
            {timeSlots.map((slot) => (
              <div 
                key={slot.timeString}
                className={cn(
                  "flex border-b min-h-[64px] relative",
                  getSlotBgColor(slot.color)
                )}
              >
                {/* 時刻表示 */}
                <div className="w-16 flex-shrink-0 p-2 border-r bg-white flex items-start">
                  <span className="text-sm font-medium text-gray-700">
                    {slot.timeString}
                  </span>
                </div>

                {/* タスクエリア */}
                <div 
                  className={cn(
                    "flex-1 p-2 relative transition-colors",
                    dragOverSlot === slot.timeString && "bg-blue-100 border-2 border-blue-300 border-dashed"
                  )}
                  onDragOver={(e) => handleDragOver(e, slot.timeString)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, slot.timeString)}
                >
                  {slot.tasks.length > 0 ? (
                    <div className="space-y-1">
                      {slot.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "px-3 py-2 rounded text-sm font-medium",
                            getTaskBgColor(task.priority)
                          )}
                        >
                          <div className="truncate">{task.title}</div>
                          {task.estimated_minutes && (
                            <div className="text-xs opacity-90">
                              {task.estimated_minutes}分
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : dragOverSlot === slot.timeString ? (
                    <div className="text-sm text-blue-600 text-center py-4">
                      ここにタスクをドロップ
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">
                      {/* 空のスロット */}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}