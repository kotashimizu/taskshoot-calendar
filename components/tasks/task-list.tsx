'use client'

import { useState, useCallback } from 'react'
import { TaskCard } from './task-card'
import { TaskForm } from './task-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  Plus, 
  Search, 
  Filter, 
  SortDesc, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { Task, TaskWithCategory, TaskFormData, TaskFilters, TaskSortOptions, TaskStats } from '@/types/tasks'
import { PRIORITY_FILTER_OPTIONS, STATUS_FILTER_OPTIONS, SORT_OPTIONS } from '@/lib/constants/task-options'
import { useToast } from '@/hooks/use-toast'

interface TaskListProps {
  tasks: TaskWithCategory[]
  loading?: boolean
  onCreateTask?: (data: TaskFormData) => Promise<void>
  onUpdateTask?: (taskId: string, data: Partial<TaskFormData>) => Promise<void>
  onDeleteTask?: (taskId: string) => Promise<void>
  onStatusChange?: (taskId: string, status: Task['status']) => Promise<void>
  onStartTimer?: (taskId: string) => void
  onStopTimer?: (taskId: string) => void
  activeTimerId?: string
  onFiltersChange?: (filters: TaskFilters) => void
  onSortChange?: (sort: TaskSortOptions) => void
  className?: string
}

interface DeleteDialogState {
  isOpen: boolean
  task: Task | null
}

interface EditDialogState {
  isOpen: boolean
  task: TaskWithCategory | null
}


export function TaskList({
  tasks,
  loading = false,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onStatusChange,
  onStartTimer,
  onStopTimer,
  activeTimerId,
  onFiltersChange,
  onSortChange,
  className = ''
}: TaskListProps) {
  const { toast } = useToast()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialog, setEditDialog] = useState<EditDialogState>({ isOpen: false, task: null })
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ isOpen: false, task: null })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [sortField, setSortField] = useState<TaskSortOptions['field']>('created_at')
  const [sortDirection, setSortDirection] = useState<TaskSortOptions['direction']>('desc')

  // 統計情報を計算
  const stats: TaskStats = {
    total_tasks: tasks.length,
    completed_tasks: tasks.filter(t => t.status === 'completed').length,
    pending_tasks: tasks.filter(t => t.status === 'pending').length,
    in_progress_tasks: tasks.filter(t => t.status === 'in_progress').length,
    overdue_tasks: tasks.filter(t => 
      t.due_date && 
      new Date(t.due_date) < new Date() && 
      t.status !== 'completed'
    ).length,
    completion_rate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0
  }

  // フィルタとソートの適用
  const applyFilters = useCallback(() => {
    const filters: TaskFilters = {}
    
    if (searchQuery.trim()) {
      filters.search = searchQuery.trim()
    }
    
    if (selectedPriority !== 'all') {
      filters.priority = [selectedPriority as any]
    }
    
    if (selectedStatus !== 'all') {
      filters.status = [selectedStatus as any]
    }

    onFiltersChange?.(filters)
  }, [searchQuery, selectedPriority, selectedStatus, onFiltersChange])

  const handleSortChange = useCallback(() => {
    onSortChange?.({ field: sortField, direction: sortDirection })
  }, [sortField, sortDirection, onSortChange])

  // イベントハンドラー
  const handleCreateTask = async (data: TaskFormData) => {
    if (!onCreateTask) return
    
    try {
      await onCreateTask(data)
      setCreateDialogOpen(false)
    } catch (error) {
      throw error
    }
  }

  const handleEditTask = (task: Task) => {
    const taskWithCategory = tasks.find(t => t.id === task.id)
    if (taskWithCategory) {
      setEditDialog({ isOpen: true, task: taskWithCategory })
    }
  }

  const handleUpdateTask = async (data: TaskFormData) => {
    if (!editDialog.task || !onUpdateTask) return
    
    try {
      await onUpdateTask(editDialog.task.id, data)
      setEditDialog({ isOpen: false, task: null })
    } catch (error) {
      throw error
    }
  }

  const handleDeleteTask = (task: Task) => {
    setDeleteDialog({ isOpen: true, task })
  }

  const confirmDeleteTask = async () => {
    if (!deleteDialog.task || !onDeleteTask) return
    
    try {
      await onDeleteTask(deleteDialog.task.id)
      setDeleteDialog({ isOpen: false, task: null })
      toast({
        title: "削除完了",
        description: "タスクが削除されました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "タスクの削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">総タスク</p>
                <p className="text-lg font-semibold">{stats.total_tasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-gray-600">進行中</p>
                <p className="text-lg font-semibold">{stats.in_progress_tasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">完了</p>
                <p className="text-lg font-semibold">{stats.completed_tasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-gray-600">期限超過</p>
                <p className="text-lg font-semibold">{stats.overdue_tasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-green-600 rounded-full" />
              <div>
                <p className="text-xs text-gray-600">完了率</p>
                <p className="text-lg font-semibold">{stats.completion_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ヘッダーとアクション */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">タスク一覧</h2>
          <p className="text-sm text-gray-600">{tasks.length}件のタスク</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              新しいタスク
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新しいタスクを作成</DialogTitle>
            </DialogHeader>
            <TaskForm 
              onSubmit={handleCreateTask}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* フィルターとソート */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            フィルター・検索
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">検索</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="タスクを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={applyFilters}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">優先度</label>
              <Select value={selectedPriority} onValueChange={(value) => {
                setSelectedPriority(value)
                setTimeout(applyFilters, 0)
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_FILTER_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">ステータス</label>
              <Select value={selectedStatus} onValueChange={(value) => {
                setSelectedStatus(value)
                setTimeout(applyFilters, 0)
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">並び順</label>
              <div className="flex gap-2">
                <Select value={sortField} onValueChange={(value: TaskSortOptions['field']) => {
                  setSortField(value)
                  setTimeout(handleSortChange, 0)
                }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    setTimeout(handleSortChange, 0)
                  }}
                >
                  <SortDesc className={`h-4 w-4 transition-transform ${
                    sortDirection === 'asc' ? 'rotate-180' : ''
                  }`} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タスクリスト */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">読み込み中...</span>
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">タスクがありません</h3>
            <p className="text-gray-600 mb-4">新しいタスクを作成して始めましょう</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              最初のタスクを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onStatusChange={onStatusChange}
              onStartTimer={onStartTimer}
              onStopTimer={onStopTimer}
              isTimerActive={activeTimerId === task.id}
            />
          ))}
        </div>
      )}

      {/* 編集ダイアログ */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && setEditDialog({ isOpen: false, task: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>タスクを編集</DialogTitle>
          </DialogHeader>
          {editDialog.task && (
            <TaskForm
              onSubmit={handleUpdateTask}
              onCancel={() => setEditDialog({ isOpen: false, task: null })}
              initialData={{
                title: editDialog.task.title,
                description: editDialog.task.description || '',
                priority: editDialog.task.priority,
                status: editDialog.task.status,
                due_date: editDialog.task.due_date || '',
                start_date: editDialog.task.start_date || '',
                estimated_minutes: editDialog.task.estimated_minutes || undefined,
                category_id: editDialog.task.category_id || '',
                notes: editDialog.task.notes || '',
              }}
              submitLabel="タスクを更新"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, task: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タスクを削除</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              本当に「{deleteDialog.task?.title}」を削除しますか？
              この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialog({ isOpen: false, task: null })}
              >
                キャンセル
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteTask}
              >
                削除する
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}