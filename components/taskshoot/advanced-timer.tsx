'use client'

/**
 * TaskShoot Phase 5: 高度なリアルタイム時間計測コンポーネント
 * - 開始・停止・一時停止・再開
 * - リアルタイム時間表示
 * - セッション記録
 * - フォーカススコア入力
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Clock,
  Target,
  Brain,
  Coffee,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimerState {
  isActive: boolean
  currentRecord: any | null
  elapsed: number
  sessions: any[] | null
}

interface AdvancedTimerProps {
  taskId: string
  taskTitle: string
  estimatedMinutes?: number
  onTimerChange?: (state: TimerState) => void
  className?: string
}

export function AdvancedTimer({ 
  taskId, 
  taskTitle, 
  estimatedMinutes,
  onTimerChange,
  className 
}: AdvancedTimerProps) {
  // State
  const [timerState, setTimerState] = useState<TimerState>({
    isActive: false,
    currentRecord: null,
    elapsed: 0,
    sessions: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [focusScore, setFocusScore] = useState(5)
  const [notes, setNotes] = useState('')
  const [sessionType, setSessionType] = useState<'normal' | 'focus' | 'break' | 'review'>('normal')
  const [displayTime, setDisplayTime] = useState(0)

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // リアルタイム時間更新
  const updateDisplayTime = useCallback(() => {
    if (timerState.isActive && timerState.currentRecord) {
      const now = Date.now()
      const startTime = new Date(timerState.currentRecord.started_at).getTime()
      const elapsed = now - startTime
      
      // 一時停止時間を差し引く
      const pausedMs = parsePausedDuration(timerState.currentRecord.total_paused_duration || '0 seconds')
      const actualElapsed = Math.max(0, elapsed - pausedMs)
      
      setDisplayTime(actualElapsed)
    } else {
      setDisplayTime(timerState.elapsed)
    }
  }, [timerState])

  // タイマー状態取得
  const fetchTimerState = useCallback(async () => {
    try {
      const response = await fetch(`/api/taskshoot/timer/v2?task_id=${taskId}&include_sessions=true`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setTimerState(result.data)
          onTimerChange?.(result.data)
          
          // アクティブな場合は開始時刻を記録
          if (result.data.isActive && result.data.currentRecord) {
            startTimeRef.current = new Date(result.data.currentRecord.started_at).getTime()
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch timer state:', error)
    }
  }, [taskId, onTimerChange])

  // タイマー操作
  const performTimerAction = async (action: 'start' | 'stop' | 'pause' | 'resume', additionalData?: any) => {
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
          task_id: taskId,
          record_id: timerState.currentRecord?.id,
          work_session_type: sessionType,
          focus_score: focusScore,
          notes: notes,
          ...additionalData
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          await fetchTimerState()
          
          // 成功時にフィールドリセット
          if (action === 'start') {
            setNotes('')
          } else if (action === 'stop') {
            setNotes('')
            setFocusScore(5)
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
    performTimerAction('start')
  }

  // タイマー停止
  const stopTimer = () => {
    performTimerAction('stop')
  }

  // タイマー一時停止
  const pauseTimer = () => {
    const reason = prompt('一時停止の理由を入力してください（任意）:')
    performTimerAction('pause', { interruption_reason: reason })
  }

  // タイマー再開
  const resumeTimer = () => {
    performTimerAction('resume')
  }

  // 初期読み込み
  useEffect(() => {
    fetchTimerState()
  }, [fetchTimerState])

  // リアルタイム更新設定
  useEffect(() => {
    if (timerState.isActive) {
      intervalRef.current = setInterval(updateDisplayTime, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    updateDisplayTime()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerState.isActive, updateDisplayTime])

  // 時間フォーマット
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // 進捗率計算
  const getProgress = (): number => {
    if (!estimatedMinutes) return 0
    const estimatedMs = estimatedMinutes * 60 * 1000
    return Math.min(100, (displayTime / estimatedMs) * 100)
  }

  // セッションタイプアイコン
  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'focus': return <Brain className="h-4 w-4" />
      case 'break': return <Coffee className="h-4 w-4" />
      case 'review': return <Target className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const isPaused = timerState.currentRecord?.status === 'paused'
  const progress = getProgress()

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {taskTitle}
        </CardTitle>
        
        {estimatedMinutes && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            目標: {estimatedMinutes}分
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* メイン時間表示 */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold tracking-wide text-primary">
            {formatTime(displayTime)}
          </div>
          
          {estimatedMinutes && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>進捗</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    progress > 100 ? "bg-amber-500" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ステータスバッジ */}
        {timerState.isActive && (
          <div className="flex justify-center">
            <Badge variant={isPaused ? "secondary" : "default"} className="flex items-center gap-1">
              {isPaused ? (
                <>
                  <Pause className="h-3 w-3" />
                  一時停止中
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  計測中
                </>
              )}
            </Badge>
          </div>
        )}

        {/* 操作ボタン */}
        <div className="flex gap-2 justify-center">
          {!timerState.isActive ? (
            <Button 
              onClick={startTimer} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              開始
            </Button>
          ) : (
            <>
              {!isPaused ? (
                <Button 
                  variant="outline" 
                  onClick={pauseTimer}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Pause className="h-4 w-4" />
                  一時停止
                </Button>
              ) : (
                <Button 
                  onClick={resumeTimer}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  再開
                </Button>
              )}
              
              <Button 
                variant="destructive" 
                onClick={stopTimer}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                停止
              </Button>
            </>
          )}
        </div>

        {/* 設定フォーム */}
        {!timerState.isActive && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="session-type" className="text-sm font-medium">
                作業タイプ
              </Label>
              <select
                id="session-type"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as any)}
                className="mt-1 w-full p-2 border border-input rounded-md text-sm"
              >
                <option value="normal">通常作業</option>
                <option value="focus">集中作業</option>
                <option value="break">休憩</option>
                <option value="review">レビュー</option>
              </select>
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                メモ（任意）
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="作業内容や目標を入力..."
                className="mt-1 text-sm"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* 停止時のフォーカススコア */}
        {timerState.isActive && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                集中度スコア: {focusScore}/10
              </Label>
              <Slider
                value={[focusScore]}
                onValueChange={(value) => setFocusScore(value[0])}
                max={10}
                min={1}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="stop-notes" className="text-sm font-medium">
                作業記録（任意）
              </Label>
              <Textarea
                id="stop-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="作業内容、気づき、課題など..."
                className="mt-1 text-sm"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* セッション履歴 */}
        {timerState.sessions && timerState.sessions.length > 0 && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium">セッション履歴</Label>
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {timerState.sessions.slice(0, 3).map((session: any, index: number) => (
                <div key={session.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    {getSessionIcon(session.session_type)}
                    <span className="capitalize">{session.session_type}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(session.session_start).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ヘルパー関数
function parsePausedDuration(duration: string): number {
  const match = duration.match(/(\d+)\s*(milliseconds?|seconds?|minutes?|hours?)/)
  if (!match) return 0

  const value = parseInt(match[1])
  const unit = match[2]

  switch (unit) {
    case 'millisecond':
    case 'milliseconds':
      return value
    case 'second':
    case 'seconds':
      return value * 1000
    case 'minute':
    case 'minutes':
      return value * 60 * 1000
    case 'hour':
    case 'hours':
      return value * 60 * 60 * 1000
    default:
      return 0
  }
}