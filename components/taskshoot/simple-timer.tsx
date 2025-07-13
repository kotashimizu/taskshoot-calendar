/**
 * シンプルなタスクシュートタイマー
 * 実用的で直感的なUIに集中
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, Square, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

interface Task {
  id: string
  title: string
  description?: string
  priority?: string
}

interface TimerState {
  isRunning: boolean
  taskId?: string
  startTime?: Date
  elapsedSeconds: number
}

interface TimeRecord {
  id: string
  task_id: string
  start_time: string
  end_time?: string
  duration_minutes?: number
}

interface SimpleTimerProps {
  tasks: Task[]
  onTimeRecorded?: (record: TimeRecord) => void
}

export function SimpleTimer({ tasks, onTimeRecorded }: SimpleTimerProps) {
  const { toast } = useToast()
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    elapsedSeconds: 0
  })
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [productivityRating, setProductivityRating] = useState<number>(3)
  const [notes, setNotes] = useState<string>('')
  const [currentRecord, setCurrentRecord] = useState<TimeRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // タイマー表示用の時間フォーマット
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }

  // タイマーの状態更新（1秒ごと）
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined

    if (timerState.isRunning) {
      interval = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1
        }))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerState.isRunning])

  // 初期化時にサーバーからタイマー状態を取得
  useEffect(() => {
    fetchTimerState()
  }, [])

  const fetchTimerState = async () => {
    try {
      const response = await fetch('/api/taskshoot/timer')
      const result = await response.json()

      if (result.success) {
        const serverState = result.data
        setTimerState({
          isRunning: serverState.isRunning,
          taskId: serverState.taskId,
          elapsedSeconds: serverState.elapsedSeconds,
          startTime: serverState.startTime ? new Date(serverState.startTime) : undefined
        })

        if (serverState.taskId) {
          setSelectedTaskId(serverState.taskId)
          // アクティブなレコードを取得
          fetchActiveRecord()
        }
      }
    } catch (error) {
      logger.error('Failed to fetch timer state', { error })
    }
  }

  const fetchActiveRecord = async () => {
    try {
      const response = await fetch('/api/taskshoot/stats')
      const result = await response.json()

      if (result.success && result.data.activeRecord) {
        setCurrentRecord(result.data.activeRecord)
      }
    } catch (error) {
      logger.error('Failed to fetch active record', { error })
    }
  }

  // タイマー開始
  const startTimer = useCallback(async () => {
    if (!selectedTaskId) {
      toast({
        title: 'エラー',
        description: 'タスクを選択してください',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/taskshoot/timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'start',
          task_id: selectedTaskId,
          notes: notes || undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        setTimerState(result.data.timer)
        setCurrentRecord(result.data.record)
        setNotes('')

        toast({
          title: 'タイマー開始',
          description: 'タスクの時間計測を開始しました',
        })
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'タイマーの開始に失敗しました',
          variant: 'destructive'
        })
      }
    } catch (error) {
      logger.error('Failed to start timer', { error })
      toast({
        title: 'エラー',
        description: 'タイマーの開始に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedTaskId, notes, toast])

  // タイマー停止
  const stopTimer = useCallback(async () => {
    if (!currentRecord) {
      toast({
        title: 'エラー',
        description: '停止できるタイマーがありません',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/taskshoot/timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'stop',
          record_id: currentRecord.id,
          productivity_rating: productivityRating,
          notes: notes || undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        setTimerState(result.data.timer)
        setCurrentRecord(null)
        setNotes('')
        setProductivityRating(3)

        onTimeRecorded?.(result.data.record)

        toast({
          title: 'タイマー停止',
          description: `${Math.round(result.data.record.duration_minutes || 0)}分の作業を記録しました`,
        })
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'タイマーの停止に失敗しました',
          variant: 'destructive'
        })
      }
    } catch (error) {
      logger.error('Failed to stop timer', { error })
      toast({
        title: 'エラー',
        description: 'タイマーの停止に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentRecord, productivityRating, notes, toast, onTimeRecorded])

  const selectedTask = tasks.find(task => task.id === selectedTaskId)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          タスクシュートタイマー
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* タイマー表示 */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold mb-2">
            {formatTime(timerState.elapsedSeconds)}
          </div>
          
          {timerState.isRunning && (
            <Badge variant="default">実行中</Badge>
          )}
        </div>

        {/* 現在のタスク表示 */}
        {timerState.isRunning && selectedTask && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="font-medium">{selectedTask.title}</div>
            {selectedTask.description && (
              <div className="text-sm text-muted-foreground">
                {selectedTask.description}
              </div>
            )}
          </div>
        )}

        {/* タスク選択（停止中のみ） */}
        {!timerState.isRunning && (
          <div className="space-y-2">
            <Label>タスク選択</Label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="タスクを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    <div className="flex items-center gap-2">
                      <span>{task.title}</span>
                      {task.priority && (
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 生産性評価（実行中のみ） */}
        {timerState.isRunning && (
          <div className="space-y-2">
            <Label>生産性評価（1-5）</Label>
            <Select 
              value={productivityRating.toString()} 
              onValueChange={(value) => setProductivityRating(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - 非常に低い</SelectItem>
                <SelectItem value="2">2 - 低い</SelectItem>
                <SelectItem value="3">3 - 普通</SelectItem>
                <SelectItem value="4">4 - 高い</SelectItem>
                <SelectItem value="5">5 - 非常に高い</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* メモ */}
        <div className="space-y-2">
          <Label>メモ（任意）</Label>
          <Input
            placeholder={timerState.isRunning ? "作業の詳細..." : "開始前のメモ..."}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* コントロールボタン */}
        <div className="flex gap-2">
          {!timerState.isRunning ? (
            <Button
              onClick={startTimer}
              disabled={isLoading || !selectedTaskId}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              開始
            </Button>
          ) : (
            <Button
              onClick={stopTimer}
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              停止
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}