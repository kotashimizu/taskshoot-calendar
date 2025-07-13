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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { TaskFormData } from '@/types/tasks'
import { PRIORITY_CONFIG } from '@/lib/task-config'
import { validateTaskFormData } from '@/lib/validation'

interface TaskCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TaskFormData) => Promise<void>
  initialData?: {
    date: Date
    allDay: boolean
    startTime?: Date
    endTime?: Date
  }
}

// 優先度オプションを共通設定から生成
const priorityOptions = Object.entries(PRIORITY_CONFIG).map(([value, config]) => ({
  value: value as keyof typeof PRIORITY_CONFIG,
  label: config.label,
}))

export function TaskCreateModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: TaskCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<TaskFormData>(() => {
    const now = new Date()
    const defaultStartDate = initialData?.date || now
    const defaultEndDate = initialData?.endTime || 
      new Date(defaultStartDate.getTime() + (2 * 60 * 60 * 1000)) // 2時間後

    return {
      title: '',
      description: '',
      priority: 'medium' as const,
      status: 'pending' as const,
      start_date: defaultStartDate.toISOString(),
      due_date: defaultEndDate.toISOString(),
      estimated_minutes: 120, // デフォルト2時間
      category_id: undefined,
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // セキュリティ重視の入力値検証
    const validation = validateTaskFormData(formData)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }
    
    setValidationErrors({})
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
      // フォームリセット
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        estimated_minutes: 120,
        category_id: undefined,
      })
    } catch (error) {
      // エラーハンドリング - 将来的にトーストやエラー表示を実装
      void error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDateChange = (field: 'start_date' | 'due_date', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const formatDateTimeLocal = (dateString: string) => {
    try {
      const date = new Date(dateString)
      // datetime-localフォーマット (YYYY-MM-DDTHH:mm)
      return format(date, "yyyy-MM-dd'T'HH:mm")
    } catch {
      return ''
    }
  }

  const formatDisplayDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'M月d日 (EEE) HH:mm')
    } catch {
      return '日時未設定'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            新しいタスクを作成
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* タイトル */}
          <div className="space-y-2">
            <Label htmlFor="title">タイトル *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="タスクのタイトルを入力"
              required
              className={validationErrors.title ? 'border-red-500' : ''}
            />
            {validationErrors.title && (
              <p className="text-sm text-red-600">{validationErrors.title}</p>
            )}
          </div>

          {/* 説明 */}
          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="タスクの詳細説明（任意）"
              rows={3}
            />
          </div>

          {/* 優先度 */}
          <div className="space-y-2">
            <Label htmlFor="priority">優先度</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: TaskFormData['priority']) => 
                setFormData(prev => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 開始日時 */}
          <div className="space-y-2">
            <Label htmlFor="start_date">開始日時</Label>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date ? formatDateTimeLocal(formData.start_date) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const date = new Date(e.target.value)
                    handleDateChange('start_date', date.toISOString())
                  }
                }}
              />
            </div>
            {initialData && formData.start_date && (
              <p className="text-xs text-gray-600">
                選択された日時: {formatDisplayDate(formData.start_date)}
              </p>
            )}
          </div>

          {/* 期限 */}
          <div className="space-y-2">
            <Label htmlFor="due_date">期限</Label>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <Input
                id="due_date"
                type="datetime-local"
                value={formData.due_date ? formatDateTimeLocal(formData.due_date) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const date = new Date(e.target.value)
                    handleDateChange('due_date', date.toISOString())
                  }
                }}
              />
            </div>
          </div>

          {/* 見積時間 */}
          <div className="space-y-2">
            <Label htmlFor="estimated_minutes">見積時間（分）</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <Input
                id="estimated_minutes"
                type="number"
                min="15"
                step="15"
                value={formData.estimated_minutes || ''}
                onChange={(e) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    estimated_minutes: parseInt(e.target.value) || undefined 
                  }))
                }
                placeholder="120"
              />
              <span className="text-sm text-gray-600">分</span>
            </div>
            {formData.estimated_minutes && (
              <p className="text-xs text-gray-600">
                約{Math.round(formData.estimated_minutes / 60 * 10) / 10}時間
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
            >
              {isSubmitting ? '作成中...' : 'タスクを作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}