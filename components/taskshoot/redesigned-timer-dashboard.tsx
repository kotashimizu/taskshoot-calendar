'use client'

/**
 * TaskShoot 再設計ダッシュボード
 * - 指定されたデザインに基づく実装
 * - 統計情報、タスク一覧、時間セクション管理
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Clock,
  Calendar,
  CheckCircle,
  User,
  Timer as TimerIcon,
  ChevronDown,
  ChevronRight
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

interface RedesignedTimerDashboardProps {
  tasks?: Task[]
  className?: string
}

interface TimeSection {
  id: string
  name: string
  startTime: string
  endTime: string
  tasks: Task[]
  expanded: boolean
}

interface DashboardStats {
  totalTasks: number
  completedTasks: number
  estimatedEndTime: string
  delayMinutes: number
  currentTime: string
}

export function RedesignedTimerDashboard({ tasks: propTasks = [], className }: RedesignedTimerDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(propTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    estimatedEndTime: '07:59',
    delayMinutes: 0,
    currentTime: '00:00'
  })
  
  const [timeSections, setTimeSections] = useState<TimeSection[]>([
    {
      id: 'no-time',
      name: '時間指定なし',
      startTime: '',
      endTime: '',
      tasks: [],
      expanded: true
    },
    {
      id: 'morning',
      name: '0:00-8:00 Section1',
      startTime: '00:00',
      endTime: '08:00',
      tasks: [],
      expanded: false
    },
    {
      id: 'mid-morning',
      name: '8:00-12:00 Section2',
      startTime: '08:00',
      endTime: '12:00',
      tasks: [],
      expanded: false
    },
    {
      id: 'afternoon',
      name: '12:00-16:00 Section3',
      startTime: '12:00',
      endTime: '16:00',
      tasks: [],
      expanded: false
    },
    {
      id: 'evening',
      name: '16:00-0:00 Section4',
      startTime: '16:00',
      endTime: '00:00',
      tasks: [],
      expanded: false
    }
  ])

  // タスクを時間セクションに分類
  useEffect(() => {
    setTasks(propTasks)
    
    // 統計計算
    const totalTasks = propTasks.length
    const completedTasks = propTasks.filter(t => t.status === 'completed').length
    const totalMinutes = propTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0)
    
    // 終了予定時刻計算（現在時刻 + 合計見積時間）
    const now = new Date()
    const endTime = new Date(now.getTime() + totalMinutes * 60000)
    const estimatedEndTime = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
    
    setStats({
      totalTasks,
      completedTasks,
      estimatedEndTime,
      delayMinutes: 0, // TODO: 実際の遅延計算
      currentTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    })

    // タスクを時間セクションに分類（簡易実装）
    const updatedSections = timeSections.map(section => {
      if (section.id === 'no-time') {
        return { ...section, tasks: propTasks }
      }
      return { ...section, tasks: [] }
    })
    
    setTimeSections(updatedSections)
  }, [propTasks])

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task)
  }

  const toggleSection = (sectionId: string) => {
    setTimeSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, expanded: !section.expanded }
        : section
    ))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const currentDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })

  return (
    <div className={cn("max-w-6xl mx-auto space-y-4", className)}>
      {/* ヘッダー統計エリア */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <span className="text-sm text-gray-600">{currentDate}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              タスク追加
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {/* 終了予定 */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                <Clock className="h-3 w-3 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">終了予定</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.estimatedEndTime}
            </div>
            <div className="text-xs text-gray-500">
              現在：{stats.currentTime}
            </div>
          </div>

          {/* 開始延長見込 */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className="w-4 h-4 bg-orange-100 rounded flex items-center justify-center">
                <TimerIcon className="h-3 w-3 text-orange-600" />
              </div>
              <span className="text-sm text-gray-600">開始延長見込</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.delayMinutes}
            </div>
            <div className="text-xs text-gray-500">
              タスク数
            </div>
          </div>

          {/* 時間表示 A */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">A 00:00</div>
            <div className="text-lg font-bold text-gray-900">B 04:00</div>
          </div>

          {/* 時間表示 C */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">C 04:00</div>
            <div className="text-lg font-bold text-gray-900">D 08:00</div>
          </div>
        </div>

        {/* 進捗表示 */}
        <div className="mt-4 flex items-center gap-2">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-bold">{stats.completedTasks} / {stats.totalTasks}</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            完了タスク数
          </div>
        </div>
      </div>

      {/* タスク一覧エリア */}
      <div className="bg-white rounded-lg shadow-sm border">
        {timeSections.map((section) => (
          <div key={section.id} className="border-b last:border-b-0">
            {/* セクションヘッダー */}
            <div 
              className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center gap-2">
                {section.expanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <User className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-900">{section.name}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>0 / {section.tasks.length}</span>
                <TimerIcon className="h-4 w-4" />
                <span>0s</span>
                <div className="w-8 h-4 bg-gray-200 rounded"></div>
                <span>0s</span>
              </div>
            </div>

            {/* タスクリスト */}
            {section.expanded && (
              <div className="p-3 space-y-2">
                {section.tasks.length > 0 ? (
                  section.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleTaskSelect(task)}
                    >
                      {/* 再生ボタン */}
                      <Button size="sm" variant="default" className="h-8 w-8 p-0 rounded-full">
                        <Play className="h-4 w-4" />
                      </Button>

                      {/* タスク情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("w-2 h-2 rounded-full", getPriorityColor(task.priority))} />
                          <span className="font-medium text-sm text-gray-900 truncate">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>プロジェクト</span>
                          <User className="h-3 w-3" />
                          <span>モード</span>
                          <div className="w-4 h-3 bg-gray-300 rounded"></div>
                          <span>タグ</span>
                        </div>
                      </div>

                      {/* 統計情報 */}
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">--:--</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">--:--</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TimerIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">--:--</span>
                        </div>
                        <div className="text-gray-600">→</div>
                        <div className="text-gray-600">--:--</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    このセクションにはタスクがありません
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}