/**
 * シンプルな統計ダッシュボード
 * 要件定義に基づく実用的な分析表示
 */

'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Clock, Target, TrendingUp, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import { formatDuration } from '@/lib/services/taskshoot'

interface TaskShootStats {
  totalTasks: number
  totalEstimatedMinutes: number
  totalActualMinutes: number
  averageAccuracy: number
  efficiencyScore: number
}

interface EfficiencyData {
  taskEfficiency: Array<{ taskId: string; efficiency: number; count: number }>
  dailyProductivity: Array<{ date: string; averageRating: number; totalMinutes: number }>
}

interface StatsDashboardProps {
  tasks?: Array<{ id: string; title: string }>
}

export function StatsDashboard({ tasks = [] }: StatsDashboardProps) {
  const { toast } = useToast()
  const [stats, setStats] = useState<TaskShootStats | null>(null)
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // データを取得
  const fetchStats = async () => {
    setIsLoading(true)
    try {
      // 基本統計を取得
      const response = await fetch('/api/taskshoot/stats')
      const result = await response.json()

      if (result.success) {
        setStats(result.data.stats)
      }

      // 効率性分析を取得
      const efficiencyResponse = await fetch('/api/taskshoot/stats?analysis=efficiency')
      const efficiencyResult = await efficiencyResponse.json()

      if (efficiencyResult.success && efficiencyResult.data.analysis) {
        setEfficiencyData(efficiencyResult.data.analysis)
      }
    } catch (error) {
      logger.error('Failed to fetch stats', { error })
      toast({
        title: 'エラー',
        description: '統計データの取得に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // 効率性のラベル
  const getEfficiencyLabel = (score: number): string => {
    if (score >= 4.5) return '非常に良い'
    if (score >= 4.0) return '良い'
    if (score >= 3.5) return '普通'
    if (score >= 3.0) return 'やや低い'
    return '低い'
  }

  // 精度のラベル
  const getAccuracyLabel = (accuracy: number): string => {
    if (accuracy >= 90) return '非常に正確'
    if (accuracy >= 80) return '正確'
    if (accuracy >= 70) return '普通'
    if (accuracy >= 60) return 'やや不正確'
    return '不正確'
  }

  // タスク名を取得
  const getTaskName = (taskId: string): string => {
    const task = tasks.find(t => t.id === taskId)
    return task?.title || '不明なタスク'
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            読み込み中...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            統計データがありません
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          タスクシュート分析
        </h2>
        <Button onClick={fetchStats} disabled={isLoading}>
          更新
        </Button>
      </div>

      {/* 基本統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">完了タスク数</p>
                <p className="text-2xl font-bold">{stats.totalTasks}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">総作業時間</p>
                <p className="text-2xl font-bold">
                  {formatDuration(stats.totalActualMinutes)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">見積もり精度</p>
                <p className="text-2xl font-bold">{stats.averageAccuracy.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {getAccuracyLabel(stats.averageAccuracy)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">生産性スコア</p>
                <p className="text-2xl font-bold">{stats.efficiencyScore.toFixed(1)}/5</p>
                <p className="text-xs text-muted-foreground">
                  {getEfficiencyLabel(stats.efficiencyScore)}
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 詳細分析 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="efficiency">効率性分析</TabsTrigger>
          <TabsTrigger value="insights">インサイト</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 見積もりvs実績 */}
            <Card>
              <CardHeader>
                <CardTitle>見積もりvs実績</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">見積もり時間:</span>
                    <span className="font-medium">
                      {formatDuration(stats.totalEstimatedMinutes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">実際の時間:</span>
                    <span className="font-medium">
                      {formatDuration(stats.totalActualMinutes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">差異:</span>
                    <span className={`font-medium ${
                      stats.totalActualMinutes > stats.totalEstimatedMinutes
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}>
                      {stats.totalActualMinutes > stats.totalEstimatedMinutes ? '+' : ''}
                      {formatDuration(Math.abs(stats.totalActualMinutes - stats.totalEstimatedMinutes))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* パフォーマンス指標 */}
            <Card>
              <CardHeader>
                <CardTitle>パフォーマンス指標</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">見積もり精度:</span>
                    <Badge variant={stats.averageAccuracy >= 80 ? 'default' : 'secondary'}>
                      {stats.averageAccuracy.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">生産性スコア:</span>
                    <Badge variant={stats.efficiencyScore >= 4 ? 'default' : 'secondary'}>
                      {stats.efficiencyScore.toFixed(1)}/5
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">タスクあたり平均時間:</span>
                    <span className="font-medium">
                      {stats.totalTasks > 0 
                        ? formatDuration(Math.round(stats.totalActualMinutes / stats.totalTasks))
                        : '-'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          {efficiencyData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* タスク別効率性 */}
              <Card>
                <CardHeader>
                  <CardTitle>タスク別効率性</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {efficiencyData.taskEfficiency.slice(0, 5).map((item) => (
                      <div key={item.taskId} className="flex justify-between items-center">
                        <span className="text-sm truncate flex-1">
                          {getTaskName(item.taskId)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.count}回
                          </Badge>
                          <Badge variant={item.efficiency >= 4 ? 'default' : 'secondary'}>
                            {item.efficiency.toFixed(1)}/5
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 日別生産性 */}
              <Card>
                <CardHeader>
                  <CardTitle>最近の生産性トレンド</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {efficiencyData.dailyProductivity.slice(0, 7).map((item) => (
                      <div key={item.date} className="flex justify-between items-center">
                        <span className="text-sm">
                          {new Date(item.date).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(item.totalMinutes)}
                          </span>
                          <Badge variant={item.averageRating >= 4 ? 'default' : 'secondary'}>
                            {item.averageRating.toFixed(1)}/5
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground">
                  効率性データがありません
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>改善のヒント</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.averageAccuracy < 70 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800">見積もり精度を改善しましょう</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      見積もり精度が{stats.averageAccuracy.toFixed(1)}%です。
                      過去の実績を参考により正確な見積もりを心がけましょう。
                    </p>
                  </div>
                )}
                
                {stats.efficiencyScore < 3.5 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800">生産性を向上させましょう</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      生産性スコアが{stats.efficiencyScore.toFixed(1)}/5です。
                      作業環境や集中力向上の方法を検討してみましょう。
                    </p>
                  </div>
                )}
                
                {stats.totalTasks >= 10 && stats.averageAccuracy >= 80 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800">素晴らしい進捗です！</h4>
                    <p className="text-sm text-green-700 mt-1">
                      {stats.totalTasks}個のタスクを完了し、見積もり精度も{stats.averageAccuracy.toFixed(1)}%と高いレベルを維持しています。
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}