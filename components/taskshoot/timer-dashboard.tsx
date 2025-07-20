'use client'

/**
 * TaskShoot Phase 5: タイマー統合ダッシュボード
 * - アクティブタイマー表示
 * - タスク選択
 * - 本日の統計
 * - 最近の記録
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { RedesignedTimerDashboard } from './redesigned-timer-dashboard'
import { DailyTimelineCalendar } from './daily-timeline-calendar'
import { AdvancedTimer } from './advanced-timer'
import { Timer as TimerIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Task } from '@/types/tasks'


interface TimerDashboardProps {
  tasks?: Task[]
  className?: string
}

export function TimerDashboard({ tasks: propTasks = [], className }: TimerDashboardProps) {
  // State
  const [tasks, setTasks] = useState<Task[]>(propTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTimer, setActiveTimer] = useState<any>(null)

  // データ取得
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // アクティブタイマーを取得
      const timerRes = await fetch('/api/taskshoot/timer/v2')


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


  // タイマー状態変更時
  const handleTimerChange = (timerState: any) => {
    setActiveTimer(timerState.isActive ? timerState : null)
    
    // タイマー停止時にデータを再取得
    if (!timerState.isActive && activeTimer?.isActive) {
      setTimeout(fetchDashboardData, 1000)
    }
  }

  // タスクスケジュール機能
  const handleTaskSchedule = async (taskId: string, startTime: string) => {
    try {
      console.log('タスクスケジュール:', { taskId, startTime })
      
      // 今日の日付と時間を組み合わせて完全な日時文字列を作成
      const today = new Date()
      const [hours, minutes] = startTime.split(':')
      const scheduleDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes))
      const isoDateString = scheduleDate.toISOString()
      
      console.log('スケジュール日時:', isoDateString)
      
      // APIを呼び出してタスクの開始時間を更新
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: isoDateString
        })
      })

      if (response.ok) {
        // 成功時にデータを再取得
        fetchDashboardData()
        console.log('タスクが正常にスケジュールされました')
      } else {
        console.error('タスクスケジュールに失敗しました')
      }
    } catch (error) {
      console.error('タスクスケジュールエラー:', error)
    }
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
          <DailyTimelineCalendar 
            tasks={tasks} 
            onTaskSchedule={handleTaskSchedule}
          />
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