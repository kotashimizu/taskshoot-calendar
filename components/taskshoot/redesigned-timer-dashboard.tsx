'use client'

/**
 * TaskShoot 再設計ダッシュボード
 * - 指定されたデザインに基づく実装
 * - 統計情報、タスク一覧、時間セクション管理
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Clock,
  Calendar,
  User,
  Timer as TimerIcon,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskList } from '@/components/tasks/task-list'
import { useTasks } from '@/hooks/use-tasks'
import { useToast } from '@/hooks/use-toast'
import { Task, TaskFormData, TaskFilters, TaskSortOptions, TaskPriority, TaskStatus } from '@/types/tasks'
import { InlineTaskRow } from '@/components/taskshoot/inline-task-row'


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
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isAddingNewTask, setIsAddingNewTask] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    estimatedEndTime: '07:59',
    delayMinutes: 0,
    currentTime: '00:00'
  })

  // タスク管理フック
  const { toast } = useToast()
  const [filters, setFilters] = useState<TaskFilters>({})
  const [sort, setSort] = useState<TaskSortOptions>({ field: 'created_at', direction: 'desc' })
  
  const {
    tasks: allTasks,
    loading: tasksLoading,
    createTask,
    updateTask,
    deleteTask
  } = useTasks(filters, sort)
  
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

  // インライン新規タスク作成
  const handleInlineCreateTask = async (data: Partial<any>) => {
    if (!data.title?.trim()) return
    
    const taskData: TaskFormData = {
      title: data.title,
      description: undefined,
      priority: (data.priority as TaskPriority) || 'medium',
      status: (data.status as TaskStatus) || 'pending',
      estimated_minutes: data.estimated_minutes,
      tags: data.tags
    }
    
    const result = await createTask(taskData)
    if (result) {
      toast({
        title: "成功",
        description: "タスクが作成されました",
      })
      setIsAddingNewTask(false)
    }
  }

  // タスク管理ハンドラー
  const handleCreateTask = async (data: TaskFormData) => {
    const result = await createTask(data)
    if (result) {
      toast({
        title: "成功",
        description: "タスクが作成されました",
      })
      setIsTaskDialogOpen(false)
    }
  }

  // インライン編集ハンドラー
  const handleInlineUpdateTask = async (data: Partial<any>) => {
    if (!data.id || !data.title?.trim()) return
    
    const taskData: Partial<TaskFormData> = {
      title: data.title,
      priority: data.priority as TaskPriority,
      status: data.status as TaskStatus,
      estimated_minutes: data.estimated_minutes,
      tags: data.tags
    }
    
    const result = await updateTask(data.id, taskData)
    if (result) {
      toast({
        title: "成功",
        description: "タスクが更新されました",
      })
    }
  }

  const handleUpdateTask = async (taskId: string, data: Partial<TaskFormData>) => {
    const result = await updateTask(taskId, data)
    if (result) {
      toast({
        title: "成功", 
        description: "タスクが更新されました",
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const result = await deleteTask(taskId)
    if (result) {
      toast({
        title: "成功",
        description: "タスクが削除されました",
      })
    }
  }

  const handleStatusChange = async (taskId: string, status: any) => {
    const result = await updateTask(taskId, { status })
    if (result) {
      toast({
        title: "ステータス更新",
        description: "タスクのステータスが更新されました",
      })
    }
  }

  const handlePlayTask = (task: Task) => {
    // TODO: タスク開始処理
    toast({
      title: "タスク開始",
      description: `「${task.title}」を開始しました`,
    })
  }

  const toggleSection = (sectionId: string) => {
    setTimeSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, expanded: !section.expanded }
        : section
    ))
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
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setIsAddingNewTask(true)}
            >
              <Plus className="h-4 w-4" />
              新規タスク
            </Button>
            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  タスク管理
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    タスク管理
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <TaskList
                    tasks={allTasks}
                    loading={tasksLoading}
                    onCreateTask={handleCreateTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                    onFiltersChange={setFilters}
                    onSortChange={setSort}
                  />
                </div>
              </DialogContent>
            </Dialog>
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
                {/* 新規タスク追加行 */}
                {section.id === 'no-time' && isAddingNewTask && (
                  <InlineTaskRow
                    isNew={true}
                    onSave={handleInlineCreateTask}
                    onCancel={() => setIsAddingNewTask(false)}
                  />
                )}
                
                {/* 既存タスク一覧 */}
                {section.tasks.length > 0 ? (
                  section.tasks.map((task) => (
                    <InlineTaskRow
                      key={task.id}
                      task={task}
                      onSave={handleInlineUpdateTask}
                      onPlay={handlePlayTask}
                    />
                  ))
                ) : !isAddingNewTask || section.id !== 'no-time' ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    このセクションにはタスクがありません
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}