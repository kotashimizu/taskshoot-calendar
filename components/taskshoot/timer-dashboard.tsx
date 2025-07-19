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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  description?: string
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
  className?: string
}

export function TimerDashboard({ className }: TimerDashboardProps) {
  // State
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null)
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTimer, setActiveTimer] = useState<any>(null)

  // データ取得
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // 並行してデータを取得
      const [tasksRes, statsRes, recordsRes, timerRes] = await Promise.all([
        fetch('/api/tasks?status=pending,in_progress&limit=20'),
        fetch('/api/taskshoot/stats?period=today'),
        fetch('/api/taskshoot/stats?recent=5'),
        fetch('/api/taskshoot/timer/v2')
      ])

      // タスク一覧
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        if (tasksData.success) {
          setTasks(tasksData.data || [])
        }
      }

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
    <div className={cn("max-w-6xl mx-auto space-y-6", className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TimerIcon className="h-7 w-7" />
          TaskShoot タイマー
        </h1>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('ja-JP')}
        </div>
      </div>

      {/* メインエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側: タイマーエリア */}
        <div className="space-y-4">
          {/* タスク選択 */}
          {!activeTimer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  タスク選択
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 ? (
                  <Select onValueChange={handleTaskSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="タイマーを開始するタスクを選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", getPriorityColor(task.priority))} />
                            <span className="truncate">{task.title}</span>
                            {task.estimated_minutes && (
                              <Badge variant="outline" className="text-xs">
                                {task.estimated_minutes}分
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>作業可能なタスクがありません</p>
                    <p className="text-sm">新しいタスクを作成してください</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* タイマーコンポーネント */}
          {selectedTask && (
            <AdvancedTimer
              taskId={selectedTask.id}
              taskTitle={selectedTask.title}
              estimatedMinutes={selectedTask.estimated_minutes}
              onTimerChange={handleTimerChange}
            />
          )}
        </div>

        {/* 右側: 統計・履歴エリア */}
        <div className="space-y-4">
          {/* 本日の統計 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                本日の統計
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyStats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {dailyStats.total_sessions}
                    </div>
                    <div className="text-sm text-muted-foreground">セッション数</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {dailyStats.total_hours.toFixed(1)}h
                    </div>
                    <div className="text-sm text-muted-foreground">作業時間</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {dailyStats.completed_tasks}
                    </div>
                    <div className="text-sm text-muted-foreground">完了タスク</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {dailyStats.avg_focus_score.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">平均集中度</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>本日のデータはまだありません</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 最近の記録 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                最近の記録
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentRecords.length > 0 ? (
                <div className="space-y-3">
                  {recentRecords.map((record, index) => (
                    <div key={record.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {record.task_title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.completed_at).toLocaleString('ja-JP')}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">
                            {formatDuration(record.duration_minutes)}
                          </Badge>
                          
                          <div className="flex items-center gap-1">
                            <span className="text-xs">集中度</span>
                            <Badge 
                              variant={record.focus_score >= 8 ? "default" : record.focus_score >= 6 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {record.focus_score}/10
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {index < recentRecords.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>記録はまだありません</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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