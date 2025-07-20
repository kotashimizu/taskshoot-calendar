'use client'

/**
 * TaskShoot Phase 5: タスクリスト統合タイマーボタン
 * - タスクリスト内のタイマー開始/停止ボタン
 * - コンパクト表示
 * - ステータス表示
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Square, 
  Clock,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskTimerButtonProps {
  taskId: string
  taskTitle: string
  estimatedMinutes?: number
  onTimerStart?: (taskId: string) => void
  onTimerStop?: (taskId: string) => void
  className?: string
  size?: 'sm' | 'default'
}

interface TimerState {
  isActive: boolean
  isPaused: boolean
  recordId: string | null
  elapsed: number
}

export function TaskTimerButton({ 
  taskId, 
  estimatedMinutes,
  onTimerStart,
  onTimerStop,
  className,
  size = 'sm'
}: TaskTimerButtonProps) {
  const [timerState, setTimerState] = useState<TimerState>({
    isActive: false,
    isPaused: false,
    recordId: null,
    elapsed: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [displayTime, setDisplayTime] = useState(0)

  // タイマー状態確認
  const checkTimerState = async () => {
    try {
      const response = await fetch(`/api/taskshoot/timer/v2?task_id=${taskId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const data = result.data
          setTimerState({
            isActive: data.isActive,
            isPaused: data.currentRecord?.status === 'paused',
            recordId: data.currentRecord?.id || null,
            elapsed: data.elapsed || 0
          })
          setDisplayTime(data.elapsed || 0)
        }
      }
    } catch (error) {
      console.error('Failed to check timer state:', error)
    }
  }

  // タイマー操作
  const performAction = async (action: 'start' | 'stop') => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/taskshoot/timer/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          task_id: action === 'start' ? taskId : undefined,
          record_id: action === 'stop' ? timerState.recordId : undefined,
          work_session_type: 'normal'
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          await checkTimerState()
          
          // コールバック実行
          if (action === 'start') {
            onTimerStart?.(taskId)
          } else {
            onTimerStop?.(taskId)
          }
        } else {
          alert(result.message || 'エラーが発生しました')
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'エラーが発生しました')
      }
    } catch (error) {
      console.error('Timer action failed:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // タイマー開始
  const startTimer = () => {
    performAction('start')
  }

  // タイマー停止
  const stopTimer = () => {
    performAction('stop')
  }

  // 時間フォーマット（コンパクト）
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}`
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  // 進捗率計算
  const getProgress = (): number => {
    if (!estimatedMinutes) return 0
    const estimatedMs = estimatedMinutes * 60 * 1000
    return Math.min(100, (displayTime / estimatedMs) * 100)
  }

  // リアルタイム更新
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (timerState.isActive && !timerState.isPaused) {
      interval = setInterval(() => {
        setDisplayTime(prev => prev + 1000)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerState.isActive, timerState.isPaused])

  // 初期読み込み
  useEffect(() => {
    checkTimerState()
  }, [taskId])

  // 全体のタイマー状態をチェック（他のタスクでタイマーが動いているか）
  const [hasActiveTimer, setHasActiveTimer] = useState(false)
  
  useEffect(() => {
    const checkGlobalTimer = async () => {
      try {
        const response = await fetch('/api/taskshoot/timer/v2')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setHasActiveTimer(result.data.isActive && result.data.currentRecord?.task_id !== taskId)
          }
        }
      } catch (error) {
        // エラーは無視
      }
    }

    if (!timerState.isActive) {
      checkGlobalTimer()
    }
  }, [taskId, timerState.isActive])

  const progress = getProgress()
  const isCurrentlyActive = timerState.isActive
  const isDisabled = isLoading || (hasActiveTimer && !isCurrentlyActive)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* タイマーボタン */}
      {!isCurrentlyActive ? (
        <Button
          size={size}
          variant="outline"
          onClick={startTimer}
          disabled={isDisabled}
          className={cn(
            "h-8 px-3",
            size === 'sm' && "h-7 px-2 text-xs"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Play className="h-3 w-3" />
              {size !== 'sm' && <span className="ml-1">開始</span>}
            </>
          )}
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          {timerState.isPaused ? (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Pause className="h-3 w-3" />
              一時停止
            </Badge>
          ) : (
            <Badge variant="default" className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(displayTime)}
            </Badge>
          )}
          
          <Button
            size={size}
            variant="destructive"
            onClick={stopTimer}
            disabled={isLoading}
            className={cn(
              "h-8 px-3",
              size === 'sm' && "h-7 px-2 text-xs"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Square className="h-3 w-3" />
                {size !== 'sm' && <span className="ml-1">停止</span>}
              </>
            )}
          </Button>
        </div>
      )}

      {/* 進捗表示 */}
      {estimatedMinutes && isCurrentlyActive && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{progress.toFixed(0)}%</span>
          {progress > 100 && (
            <Badge variant="outline" className="text-xs text-amber-600">
              超過
            </Badge>
          )}
        </div>
      )}

      {/* 他のタスクでタイマー実行中の警告 */}
      {hasActiveTimer && !isCurrentlyActive && (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          他タスク実行中
        </Badge>
      )}
    </div>
  )
}