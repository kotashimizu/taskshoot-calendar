'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  Tag, 
  AlertCircle,
  Edit,
  Trash2
} from 'lucide-react'
import { TaskWithCategory } from '@/types/tasks'
import { format } from 'date-fns'
import { STATUS_CONFIG, PRIORITY_CONFIG, formatTaskDuration } from '@/lib/task-config'

interface TaskDetailModalProps {
  task: TaskWithCategory | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (task: TaskWithCategory) => void
  onDelete?: (taskId: string) => void
  onStatusChange?: (taskId: string, status: TaskWithCategory['status']) => void
}

// 設定は共通ファイルからインポート

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!task) return null

  const StatusIcon = STATUS_CONFIG[task.status].icon
  const statusInfo = STATUS_CONFIG[task.status]
  const priorityInfo = PRIORITY_CONFIG[task.priority]

  const handleStatusChange = (newStatus: TaskWithCategory['status']) => {
    onStatusChange?.(task.id, newStatus)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete(task.id)
      onClose()
    } catch (error) {
      // エラーハンドリング - 将来的にトーストやエラー表示を実装
      void error
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '日時未設定'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '日時未設定'
      return format(date, 'yyyy年M月d日 (EEE) HH:mm')
    } catch {
      return '日時未設定'
    }
  }

  // formatTaskDurationを共通ファイルから使用

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby="task-detail-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5 text-gray-600" />
              <span className="text-lg font-semibold">{task.title}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* ステータスと優先度 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">ステータス:</span>
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">優先度:</span>
              <Badge className={priorityInfo.color}>
                <AlertCircle className="h-3 w-3 mr-1" />
                {priorityInfo.label}
              </Badge>
            </div>
          </div>

          {/* 説明 */}
          {task.description && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium text-gray-900 mb-2">説明</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
              </CardContent>
            </Card>
          )}

          {/* 日時情報 */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium text-gray-900 mb-3">日時情報</h4>
              <div className="space-y-3">
                {task.start_date && (
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-600">開始:</span>
                      <span className="ml-2 text-gray-900">{formatDate(task.start_date)}</span>
                    </div>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-600">期限:</span>
                      <span className="ml-2 text-gray-900">{formatDate(task.due_date)}</span>
                    </div>
                  </div>
                )}
                {task.estimated_minutes && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-600">見積時間:</span>
                      <span className="ml-2 text-gray-900">{formatTaskDuration(task.estimated_minutes)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* カテゴリ */}
          {task.category && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium text-gray-900 mb-3">カテゴリ</h4>
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{task.category.icon}</span>
                    <span 
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: task.category.color }}
                    >
                      {task.category.name}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ステータス変更ボタン */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium text-gray-900 mb-3">ステータス変更</h4>
              <div className="flex gap-2">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <Button
                    key={status}
                    variant={task.status === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusChange(status as TaskWithCategory['status'])}
                    className="flex items-center gap-2"
                  >
                    <config.icon className="h-4 w-4" />
                    {config.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* メタデータ */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span>作成日: {formatDate(task.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span>更新日: {formatDate(task.updated_at)}</span>
            </div>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                onClick={() => onEdit(task)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                編集
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? '削除中...' : '削除'}
              </Button>
            )}
          </div>
          <Button onClick={onClose}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}