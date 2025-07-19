'use client'

/**
 * TaskShoot専用ページ
 * - TimerDashboard統合
 * - 時間計測メインインターフェース
 * - リアルタイム分析表示
 */

import React from 'react'
import { TimerDashboard } from '@/components/taskshoot/timer-dashboard'
import { useTasks } from '@/hooks/use-tasks'
import { TaskFilters, TaskSortOptions } from '@/types/tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Timer as TimerIcon,
  Target,
  TrendingUp,
  Clock,
  Brain,
  Zap
} from 'lucide-react'

export default function TaskShootPage() {
  // タスクデータ取得
  const filters: TaskFilters = { status: ['pending', 'in_progress'] }
  const sort: TaskSortOptions = { field: 'created_at', direction: 'desc' }
  const { tasks } = useTasks(filters, sort)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* ヘッダーセクション */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-primary/10 rounded-full">
            <TimerIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">TaskShoot</h1>
            <p className="text-muted-foreground">時間を可視化し、生産性を最大化</p>
          </div>
        </div>

        {/* 機能紹介バッジ */}
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            リアルタイム時間計測
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            見積もりvs実績分析
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            集中度スコア記録
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            生産性向上提案
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            ワンクリック開始
          </Badge>
        </div>
      </div>

      {/* メインダッシュボード */}
      <TimerDashboard tasks={tasks} />

      {/* TaskShoot Method説明セクション */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              時間見積もり
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              タスクごとに必要な時間を予測し、現実的な計画を立てます。過去のデータから学習して精度を向上させます。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">2</span>
              </div>
              実時間計測
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              ワンクリックでタイマー開始。一時停止・再開機能で正確な作業時間を記録し、中断理由も管理します。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">3</span>
              </div>
              分析・改善
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              見積もりと実績を比較分析。集中度スコアと合わせて、あなたの生産性パターンを可視化し改善提案を行います。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 使用方法ガイド */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            使用方法ガイド
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">📝 タスク作成・準備</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• メインダッシュボードでタスクを選択</li>
                  <li>• 時間見積もりを設定（分単位）</li>
                  <li>• 作業タイプを選択（通常・集中・休憩・レビュー）</li>
                  <li>• 作業内容のメモを記入（任意）</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">⏱️ 時間計測・実行</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 「開始」ボタンでタイマー開始</li>
                  <li>• 必要に応じて一時停止・再開</li>
                  <li>• 集中度スコア（1-10）を設定</li>
                  <li>• 「停止」で作業完了・記録保存</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">📊 分析・振り返り</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 本日の統計で進捗確認</li>
                  <li>• 見積もりvs実績の比較分析</li>
                  <li>• 集中度スコアの傾向把握</li>
                  <li>• 改善点の特定と次回への活用</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">🎯 継続的改善</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 過去データから見積もり精度向上</li>
                  <li>• 生産性の高い時間帯を特定</li>
                  <li>• タスクタイプ別の作業パターン分析</li>
                  <li>• 個人最適化された工夫の蓄積</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips & Best Practices */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Zap className="h-5 w-5" />
            TaskShoot活用のコツ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">💡 効果的な時間見積もり</h4>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• 最初は多めに見積もってOK</li>
                <li>• 似たタスクの過去データを参考に</li>
                <li>• 集中できる時間帯を考慮</li>
                <li>• バッファー時間も含めて設定</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-purple-600 mb-2">🎯 集中度向上のコツ</h4>
              <ul className="space-y-1 text-sm text-purple-700">
                <li>• 作業前に目標を明確化</li>
                <li>• 中断要因を事前に排除</li>
                <li>• 適切な休憩を取り入れる</li>
                <li>• 集中度スコアを正直に記録</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}