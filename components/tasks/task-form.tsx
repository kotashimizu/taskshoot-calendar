'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Calendar, Clock, Tag, AlertTriangle } from 'lucide-react'
import { TaskFormData, TASK_CONSTRAINTS } from '@/types/tasks'
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/lib/constants/task-options'
import { useToast } from '@/hooks/use-toast'

const taskFormSchema = z.object({
  title: z.string()
    .min(1, 'タスク名は必須です')
    .max(TASK_CONSTRAINTS.TITLE_MAX_LENGTH, `タスク名は${TASK_CONSTRAINTS.TITLE_MAX_LENGTH}文字以内で入力してください`),
  description: z.string()
    .max(TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH, `説明は${TASK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}文字以内で入力してください`)
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled'] as const),
  due_date: z.string().optional(),
  start_date: z.string().optional(),
  estimated_minutes: z.number().min(0, '見積もり時間は0分以上で入力してください').optional(),
  category_id: z.string().optional(),
  notes: z.string()
    .max(TASK_CONSTRAINTS.NOTES_MAX_LENGTH, `メモは${TASK_CONSTRAINTS.NOTES_MAX_LENGTH}文字以内で入力してください`)
    .optional(),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<TaskFormData>
  loading?: boolean
  submitLabel?: string
}


export function TaskForm({ 
  onSubmit, 
  onCancel, 
  initialData, 
  loading = false, 
  submitLabel = 'タスクを作成' 
}: TaskFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      priority: initialData?.priority || 'medium',
      status: initialData?.status || 'pending',
      due_date: initialData?.due_date || '',
      start_date: initialData?.start_date || '',
      estimated_minutes: initialData?.estimated_minutes || undefined,
      category_id: initialData?.category_id || '',
      notes: initialData?.notes || '',
    },
  })

  const handleSubmit = async (values: TaskFormValues) => {
    try {
      setIsSubmitting(true)
      
      const taskData: TaskFormData = {
        ...values,
        due_date: values.due_date || undefined,
        start_date: values.start_date || undefined,
        category_id: values.category_id || undefined,
        notes: values.notes || undefined,
      }

      await onSubmit(taskData)
      
      toast({
        title: "成功",
        description: initialData ? "タスクが更新されました" : "タスクが作成されました",
      })

      if (!initialData) {
        form.reset()
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "操作に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          {initialData ? 'タスクを編集' : '新しいタスクを作成'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* タスク名 */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>タスク名 <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="タスク名を入力してください" 
                      {...field} 
                      disabled={loading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 説明 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="タスクの詳細説明を入力してください"
                      className="resize-none"
                      rows={3}
                      {...field}
                      disabled={loading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 優先度 */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>優先度</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading || isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="優先度を選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ステータス */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ステータス</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading || isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="ステータスを選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 開始日時 */}
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      開始日時
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field}
                        disabled={loading || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 期限 */}
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      期限
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field}
                        disabled={loading || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 見積もり時間 */}
            <FormField
              control={form.control}
              name="estimated_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    見積もり時間（分）
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="60"
                      min="0"
                      step="15"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      disabled={loading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* メモ */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メモ</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="追加のメモや詳細情報"
                      className="resize-none"
                      rows={2}
                      {...field}
                      disabled={loading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* アクションボタン */}
            <div className="flex justify-end gap-3 pt-4">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={loading || isSubmitting}
                >
                  キャンセル
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={loading || isSubmitting}
                className="min-w-32"
              >
                {isSubmitting ? '保存中...' : submitLabel}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}