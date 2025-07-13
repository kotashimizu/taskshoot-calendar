/**
 * シンプルな時間見積もりフォーム
 */

'use client'

import { useState } from 'react'
import { Clock, Target, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

interface Task {
  id: string
  title: string
  description?: string
}

interface TaskEstimate {
  id: string
  task_id: string
  estimated_minutes: number
  confidence_level: number
  notes?: string
}

interface EstimateFormProps {
  task: Task
  existingEstimate?: TaskEstimate | null
  onEstimateCreated?: (estimate: TaskEstimate) => void
  onCancel?: () => void
}

export function EstimateForm({ 
  task, 
  existingEstimate, 
  onEstimateCreated, 
  onCancel 
}: EstimateFormProps) {
  const { toast } = useToast()
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    existingEstimate?.estimated_minutes || 60
  )
  const [confidenceLevel, setConfidenceLevel] = useState(
    existingEstimate?.confidence_level || 50
  )
  const [notes, setNotes] = useState(existingEstimate?.notes || '')
  const [isLoading, setIsLoading] = useState(false)

  // 時間の表示フォーマット
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}分`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}時間${remainingMinutes}分` : `${hours}時間`
    }
  }

  // 信頼度のラベル
  const getConfidenceLabel = (level: number): string => {
    if (level >= 80) return '高い'
    if (level >= 60) return 'やや高い'
    if (level >= 40) return '普通'
    if (level >= 20) return 'やや低い'
    return '低い'
  }

  // 見積もり保存
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (estimatedMinutes < 1) {
      toast({
        title: 'エラー',
        description: '見積もり時間は1分以上を入力してください',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/taskshoot/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task_id: task.id,
          estimated_minutes: estimatedMinutes,
          confidence_level: confidenceLevel,
          notes: notes || undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: '見積もりを保存しました',
          description: `${formatDuration(estimatedMinutes)}で見積もりを設定しました`,
        })
        
        onEstimateCreated?.(result.data)
      } else {
        toast({
          title: 'エラー',
          description: result.error || '見積もりの保存に失敗しました',
          variant: 'destructive'
        })
      }
    } catch (error) {
      logger.error('Failed to save estimate', { error })
      toast({
        title: 'エラー',
        description: '見積もりの保存に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          時間見積もり
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          タスク: {task.title}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 見積もり時間 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              見積もり時間
            </Label>
            <div className="space-y-2">
              <Input
                type="number"
                min="1"
                max="10080"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 1)}
                placeholder="分単位で入力"
              />
              <div className="text-sm text-muted-foreground">
                {formatDuration(estimatedMinutes)}
              </div>
            </div>
          </div>

          {/* 信頼度 */}
          <div className="space-y-3">
            <Label>
              見積もりの信頼度: {confidenceLevel}% ({getConfidenceLabel(confidenceLevel)})
            </Label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[confidenceLevel]}
              onValueChange={(value) => setConfidenceLevel(value[0] ?? 50)}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground">
              この見積もりにどの程度自信がありますか？
            </div>
          </div>

          {/* メモ */}
          <div className="space-y-2">
            <Label>メモ（任意）</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="見積もりの根拠や注意点など..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? '保存中...' : '保存'}
            </Button>
            
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                キャンセル
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}