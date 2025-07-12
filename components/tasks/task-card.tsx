'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Calendar, 
  Clock, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle,
  AlertTriangle,
  Tag
} from 'lucide-react'
import { Task, TaskWithCategory, TASK_PRIORITY_CONFIG, TASK_STATUS_CONFIG, isTaskOverdue, formatDuration } from '@/types/tasks'
import { format } from 'date-fns'

interface TaskCardProps {
  task: TaskWithCategory
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
  onStatusChange?: (taskId: string, status: Task['status']) => void
  onStartTimer?: (taskId: string) => void
  onStopTimer?: (taskId: string) => void
  isTimerActive?: boolean
  className?: string
}

export function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  onStartTimer, 
  onStopTimer, 
  isTimerActive = false,
  className = ''
}: TaskCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority]
  const statusConfig = TASK_STATUS_CONFIG[task.status]
  const isOverdue = isTaskOverdue(task)
  
  const handleStatusChange = (newStatus: Task['status']) => {
    if (!onStatusChange) return
    
    try {
      setIsLoading(true)
      onStatusChange(task.id, newStatus)
    } catch (error) {
      // Error handling is done by the parent component
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartTimer = () => {
    if (onStartTimer) {
      onStartTimer(task.id)
    }
  }

  const handleStopTimer = () => {
    if (onStopTimer) {
      onStopTimer(task.id)
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'M/d(E) HH:mm')
  }

  const getCardBorderColor = () => {
    if (isOverdue && task.status !== 'completed') {
      return 'border-red-300 bg-red-50'
    }
    if (task.status === 'completed') {
      return 'border-green-300 bg-green-50'
    }
    if (task.priority === 'urgent') {
      return 'border-red-200 bg-red-25'
    }
    return 'border-gray-200'
  }

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${getCardBorderColor()} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-sm leading-5 ${
              task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
            }`}>
              {task.title}
            </h3>
            
            {task.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="mr-2 h-4 w-4" />
                  編集
                </DropdownMenuItem>
              )}
              
              {task.status !== 'completed' && (
                <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  完了にする
                </DropdownMenuItem>
              )}
              
              {task.status === 'completed' && (
                <DropdownMenuItem onClick={() => handleStatusChange('pending')}>
                  <Play className="mr-2 h-4 w-4" />
                  未完了にする
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(task)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* ステータスと優先度のバッジ */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            variant="secondary" 
            className="text-xs"
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.textColor,
              borderColor: statusConfig.color,
            }}
          >
            {statusConfig.label}
          </Badge>
          
          <Badge 
            variant="outline"
            className="text-xs"
            style={{
              backgroundColor: priorityConfig.bgColor,
              color: priorityConfig.textColor,
              borderColor: priorityConfig.color,
            }}
          >
            {priorityConfig.label}
          </Badge>
          
          {isOverdue && task.status !== 'completed' && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              期限超過
            </Badge>
          )}
        </div>

        {/* カテゴリ */}
        {task.category && (
          <div className="flex items-center gap-1">
            <Tag className="h-3 w-3 text-gray-500" />
            <span className="text-xs text-gray-600">{task.category.name}</span>
          </div>
        )}

        {/* 日時情報 */}
        <div className="space-y-1 text-xs text-gray-600">
          {task.start_date && (
            <div className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              <span>開始: {formatDate(task.start_date)}</span>
            </div>
          )}
          
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
              <Calendar className="h-3 w-3" />
              <span>期限: {formatDate(task.due_date)}</span>
            </div>
          )}
          
          {task.estimated_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>見積: {formatDuration(task.estimated_minutes)}</span>
            </div>
          )}
        </div>

        {/* タイマーアクション */}
        {(onStartTimer || onStopTimer) && task.status !== 'completed' && (
          <div className="pt-2 border-t border-gray-100">
            {isTimerActive ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleStopTimer}
                className="w-full text-xs h-8"
                disabled={isLoading}
              >
                <Pause className="w-3 h-3 mr-1" />
                タイマー停止
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleStartTimer}
                className="w-full text-xs h-8"
                disabled={isLoading}
              >
                <Play className="w-3 h-3 mr-1" />
                タイマー開始
              </Button>
            )}
          </div>
        )}

        {/* 最終更新日時 */}
        <div className="text-xs text-gray-400 pt-1 border-t border-gray-100">
          更新: {format(new Date(task.updated_at), 'M/d HH:mm')}
        </div>
      </CardContent>
    </Card>
  )
}