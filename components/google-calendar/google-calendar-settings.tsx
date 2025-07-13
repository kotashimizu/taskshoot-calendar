'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  Calendar,
  Settings,
  RotateCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Clock,
  Shield,
} from 'lucide-react'
import { GoogleCalendarConfig, CalendarListEntry } from '@/types/google-calendar'

interface GoogleCalendarSettingsProps {
  className?: string
}

export function GoogleCalendarSettings({ className = '' }: GoogleCalendarSettingsProps) {
  const { toast } = useToast()
  
  // 状態管理
  const [config, setConfig] = useState<GoogleCalendarConfig | null>(null)
  const [calendars, setCalendars] = useState<CalendarListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // 初期データ読み込み
  useEffect(() => {
    loadConfiguration()
  }, []) // loadConfigurationをuseCallbackでメモ化する必要がある

  const loadConfiguration = useCallback(async () => {
    try {
      setLoading(true)
      
      // 設定を取得
      const configResponse = await fetch('/api/google-calendar/config')
      const configData = await configResponse.json()
      
      if (configResponse.ok) {
        setConfig(configData.config)
        setIsConnected(configData.config.is_connected)
        
        // 接続されている場合はカレンダー一覧も取得
        if (configData.config.is_connected) {
          await loadCalendars()
        }
      } else {
        throw new Error(configData.error || 'Failed to load configuration')
      }
      
    } catch (error) {
      console.error('Failed to load configuration:', error)
      toast({
        title: "設定の読み込みに失敗しました",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCalendars = async () => {
    try {
      const response = await fetch('/api/google-calendar/calendars')
      const data = await response.json()
      
      if (response.ok) {
        setCalendars(data.calendars)
      } else {
        throw new Error(data.error || 'Failed to load calendars')
      }
    } catch (error) {
      console.error('Failed to load calendars:', error)
      toast({
        title: "カレンダーの読み込みに失敗しました",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleConnect = useCallback(async () => {
    try {
      // 認証URLを取得
      const response = await fetch('/api/google-calendar/auth')
      const data = await response.json()
      
      if (response.ok) {
        // Google認証ページにリダイレクト
        window.location.href = data.auth_url
      } else {
        throw new Error(data.error || 'Failed to get auth URL')
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      toast({
        title: "接続に失敗しました",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }, [])

  const handleDisconnect = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/google-calendar/auth', {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setIsConnected(false)
        setCalendars([])
        setConfig(prev => prev ? { ...prev, enabled: false } : null)
        
        toast({
          title: "接続を解除しました",
          description: "Google Calendarとの連携を停止しました",
        })
      } else {
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
      toast({
        title: "接続解除に失敗しました",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleConfigUpdate = async (updates: Partial<GoogleCalendarConfig>) => {
    if (!config) return

    try {
      setSaving(true)
      
      const updatedConfig = { ...config, ...updates }
      
      const response = await fetch('/api/google-calendar/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setConfig(data.config)
        toast({
          title: "設定を更新しました",
          description: data.message,
        })
      } else {
        throw new Error(data.error || 'Failed to update configuration')
      }
    } catch (error) {
      console.error('Failed to update config:', error)
      toast({
        title: "設定の更新に失敗しました",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCalendarToggle = async (calendarId: string, selected: boolean) => {
    if (!config) return

    const updatedCalendars = selected
      ? [...(config.selected_calendars || []), calendarId]
      : (config.selected_calendars || []).filter(id => id !== calendarId)

    await handleConfigUpdate({ selected_calendars: updatedCalendars })
  }

  const handleManualSync = async () => {
    if (!config?.enabled) return

    try {
      setSyncing(true)
      
      const response = await fetch('/api/google-calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: config.sync_direction,
          calendar_ids: config.selected_calendars,
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "同期が完了しました",
          description: `${data.result.eventsProcessed} 件のイベントを処理しました`,
        })
        
        // 設定をリロードして同期状態を更新
        await loadConfiguration()
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Sync failed:', error)
      toast({
        title: "同期に失敗しました",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          読み込み中...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 接続状態 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Google Calendar 連携</span>
          </CardTitle>
          <CardDescription>
            Google Calendarとタスクを同期して、すべての予定を一箇所で管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">接続済み</span>
                  <Badge variant="outline" className="text-green-600">
                    {config?.enabled ? '有効' : '無効'}
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium">未接続</span>
                </>
              )}
            </div>
            
            {isConnected ? (
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                disabled={saving}
              >
                接続を解除
              </Button>
            ) : (
              <Button 
                onClick={handleConnect}
                className="flex items-center space-x-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Google Calendar に接続</span>
              </Button>
            )}
          </div>

          {isConnected && config && (
            <>
              <Separator />
              
              {/* 同期有効/無効切り替え */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sync-enabled" className="text-base font-medium">
                    同期を有効にする
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Google CalendarとTaskShootのタスクを自動同期します
                  </p>
                </div>
                <Switch
                  id="sync-enabled"
                  checked={config.enabled}
                  onCheckedChange={(enabled) => handleConfigUpdate({ enabled })}
                  disabled={saving}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 同期設定 */}
      {isConnected && config?.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>同期設定</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 同期方向 */}
            <div className="space-y-2">
              <Label>同期方向</Label>
              <Select
                value={config.sync_direction}
                onValueChange={(value: any) => handleConfigUpdate({ sync_direction: value })}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">双方向（推奨）</SelectItem>
                  <SelectItem value="gcal_to_taskshoot">Google Calendar → TaskShoot</SelectItem>
                  <SelectItem value="taskshoot_to_gcal">TaskShoot → Google Calendar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {config.sync_direction === 'both' && '両方向でタスクとイベントを同期します'}
                {config.sync_direction === 'gcal_to_taskshoot' && 'Google Calendarのイベントをタスクとして取り込みます'}
                {config.sync_direction === 'taskshoot_to_gcal' && 'タスクをGoogle Calendarのイベントとして出力します'}
              </p>
            </div>

            {/* 同期頻度 */}
            <div className="space-y-2">
              <Label>自動同期頻度</Label>
              <Select
                value={config.sync_frequency}
                onValueChange={(value: any) => handleConfigUpdate({ sync_frequency: value })}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">手動のみ</SelectItem>
                  <SelectItem value="5min">5分ごと</SelectItem>
                  <SelectItem value="15min">15分ごと（推奨）</SelectItem>
                  <SelectItem value="30min">30分ごと</SelectItem>
                  <SelectItem value="1hour">1時間ごと</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 自動同期有効/無効 */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-sync" className="text-base font-medium">
                  自動同期
                </Label>
                <p className="text-sm text-muted-foreground">
                  設定した頻度で自動的に同期を実行します
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={config.auto_sync_enabled}
                onCheckedChange={(auto_sync_enabled) => 
                  handleConfigUpdate({ auto_sync_enabled })
                }
                disabled={saving || config.sync_frequency === 'manual'}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* カレンダー選択 */}
      {isConnected && config?.enabled && calendars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>同期するカレンダー</CardTitle>
            <CardDescription>
              同期対象とするGoogle Calendarを選択してください（最大10個）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {calendars.map((calendar) => (
                <div
                  key={calendar.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                    />
                    <div>
                      <div className="font-medium flex items-center space-x-2">
                        <span>{calendar.summary}</span>
                        {calendar.primary && (
                          <Badge variant="secondary" className="text-xs">
                            メイン
                          </Badge>
                        )}
                      </div>
                      {calendar.description && (
                        <p className="text-sm text-muted-foreground">
                          {calendar.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        <span>{calendar.accessRole}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Switch
                    checked={config.selected_calendars?.includes(calendar.id!) || false}
                    onCheckedChange={(selected) => 
                      handleCalendarToggle(calendar.id!, selected)
                    }
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 同期操作 */}
      {isConnected && config?.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RotateCw className="h-5 w-5" />
              <span>同期操作</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">手動同期</p>
                <p className="text-sm text-muted-foreground">
                  今すぐGoogle Calendarとの同期を実行します
                </p>
                {config.last_sync_at && (
                  <p className="text-xs text-muted-foreground flex items-center space-x-1 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      最終同期: {new Date(config.last_sync_at).toLocaleString('ja-JP')}
                    </span>
                  </p>
                )}
              </div>
              
              <Button
                onClick={handleManualSync}
                disabled={syncing || saving}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? '同期中...' : '今すぐ同期'}</span>
              </Button>
            </div>

            {/* 同期状態 */}
            <div className="flex items-center space-x-2 text-sm">
              {config.sync_status === 'success' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">同期完了</span>
                </>
              )}
              {config.sync_status === 'error' && (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">同期エラー</span>
                </>
              )}
              {config.sync_status === 'syncing' && (
                <>
                  <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                  <span className="text-blue-600">同期中</span>
                </>
              )}
              {config.sync_status === 'idle' && (
                <>
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">待機中</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 注意事項 */}
      {isConnected && config?.enabled && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-orange-800">重要な注意事項</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• 同期は一方向または双方向で行われます</li>
                  <li>• TaskShootで作成されたイベントは「TaskShoot」のタグが付きます</li>
                  <li>• 削除されたタスクに対応するGoogle Calendarイベントも削除されます</li>
                  <li>• 大量のイベントがある場合、初回同期に時間がかかることがあります</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}