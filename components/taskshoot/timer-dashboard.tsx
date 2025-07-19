'use client'

/**
 * TaskShoot Phase 5: タイマー統合ダッシュボード
 * - アクティブタイマー表示
 * - タスク選択
 * - 本日の統計
 * - 最近の記録
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RedesignedTimerDashboard } from './redesigned-timer-dashboard'
import { DailyTimelineCalendar } from './daily-timeline-calendar'
import { AdvancedTimer } from './advanced-timer'
import { 
  Clock, 
  Play, 
  Target, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  BarChart3,
  Timer as TimerIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description?: string | null
  priority: string
  estimated_minutes?: number
  status: string
}

interface DailyStats {
  total_sessions: number
  total_hours: number
  completed_tasks: number
  avg_focus_score: number
}

interface RecentRecord {
  id: string
  task_title: string
  duration_minutes: number
  focus_score: number
  completed_at: string
}

interface TimerDashboardProps {
  tasks?: Task[]
  className?: string
}

export function TimerDashboard({ tasks: propTasks = [], className }: TimerDashboardProps) {
  // State
  const [tasks, setTasks] = useState<Task[]>(propTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null)
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTimer, setActiveTimer] = useState<any>(null)

  // データ取得
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // 並行してデータを取得（タスクは除く - propsから取得）
      const [statsRes, recordsRes, timerRes] = await Promise.all([
        fetch('/api/taskshoot/stats?period=today'),
        fetch('/api/taskshoot/stats?recent=5'),
        fetch('/api/taskshoot/timer/v2')
      ])

      // 本日の統計
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (statsData.success) {
          setDailyStats(statsData.data)
        }
      }

      // 最近の記録
      if (recordsRes.ok) {
        const recordsData = await recordsRes.json()
        if (recordsData.success) {
          setRecentRecords(recordsData.data || [])
        }
      }

      // アクティブタイマー
      if (timerRes.ok) {
        const timerData = await timerRes.json()
        if (timerData.success && timerData.data.isActive) {
          setActiveTimer(timerData.data)
          // アクティブなタスクを選択状態にする
          const activeTask = tasks.find(t => t.id === timerData.data.currentRecord?.task_id)
          if (activeTask) {
            setSelectedTask(activeTask)
          }
        }
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // タスク選択
  const handleTaskSelect = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    setSelectedTask(task || null)
  }

  // タイマー状態変更時
  const handleTimerChange = (timerState: any) => {
    setActiveTimer(timerState.isActive ? timerState : null)
    
    // タイマー停止時にデータを再取得
    if (!timerState.isActive && activeTimer?.isActive) {
      setTimeout(fetchDashboardData, 1000)
    }
  }

  // 優先度カラー
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  // 時間フォーマット
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    
    if (hours > 0) {
      return `${hours}時間${mins}分`
    }
    return `${mins}分`
  }

  // propsでタスクが変更された際の更新
  useEffect(() => {
    setTasks(propTasks)
  }, [propTasks])

  // 初期読み込み
  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="flex items-center space-x-2">
          <TimerIcon className="h-6 w-6 animate-spin" />
          <span>読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("max-w-7xl mx-auto space-y-6", className)}>
      {/* 新しいデザインのダッシュボード */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 左側: メインダッシュボード (2/3幅) */}
        <div className="xl:col-span-2">
          <RedesignedTimerDashboard tasks={tasks} />
        </div>

        {/* 右側: タイムラインカレンダー (1/3幅) */}
        <div className="xl:col-span-1">
          <DailyTimelineCalendar tasks={tasks} />
        </div>
      </div>

      {/* アクティブタイマー表示 */}
      {selectedTask && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <AdvancedTimer
            taskId={selectedTask.id}
            taskTitle={selectedTask.title}
            estimatedMinutes={selectedTask.estimated_minutes}
            onTimerChange={handleTimerChange}
          />
        </div>
      )}

      {/* アクティブタイマー通知 */}
      {activeTimer && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="w-64 shadow-lg border-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium">タイマー実行中</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {activeTimer.currentRecord?.tasks?.title}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}