/**
 * 改善されたダッシュボードコンポーネント
 * プロフェッショナルUX評価に基づく実装
 */

'use client';

import { useState, useMemo } from 'react';
import { TaskWithCategory } from '@/types/tasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Calendar,
  Plus,
  Target,
  Zap,
  BarChart3
} from 'lucide-react';

interface EnhancedDashboardProps {
  tasks: TaskWithCategory[];
  onNavigateToTasks: () => void;
  onNavigateToCalendar: () => void;
  onCreateTask: () => void;
}

interface DashboardMetrics {
  todayTasks: number;
  overdueCount: number;
  completionRate: number;
  totalTasks: number;
  completedToday: number;
  inProgress: number;
}

export function EnhancedDashboard({ 
  tasks, 
  onNavigateToTasks, 
  onNavigateToCalendar,
  onCreateTask 
}: EnhancedDashboardProps) {
  const [timeOfDay] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  });

  // メトリクスの計算
  const metrics = useMemo((): DashboardMetrics => {
    const today = new Date().toDateString();
    
    const todayTasks = tasks.filter(task => {
      if (!task.due_date) return false;
      return new Date(task.due_date).toDateString() === today;
    });

    const overdueTasks = tasks.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      return new Date(task.due_date) < new Date();
    });

    const completedTasks = tasks.filter(task => task.status === 'completed');
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress');

    const completionRate = tasks.length > 0 
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : 0;

    return {
      todayTasks: todayTasks.length,
      overdueCount: overdueTasks.length,
      completionRate,
      totalTasks: tasks.length,
      completedToday: todayTasks.filter(t => t.status === 'completed').length,
      inProgress: inProgressTasks.length,
    };
  }, [tasks]);

  // 時間帯に応じたグリーティング
  const getGreeting = () => {
    switch (timeOfDay) {
      case 'morning': return 'おはようございます！今日も頑張りましょう 🌅';
      case 'afternoon': return 'お疲れさまです！午後も集中していきましょう ☀️';
      case 'evening': return 'お疲れさまでした！今日の振り返りをしましょう 🌙';
      default: return 'TaskShoot Calendarへようこそ！';
    }
  };

  // 緊急度の高いタスク
  const urgentTasks = useMemo(() => {
    return tasks
      .filter(task => 
        task.status !== 'completed' && 
        (task.priority === 'urgent' || 
         (task.due_date && new Date(task.due_date) < new Date()))
      )
      .slice(0, 3);
  }, [tasks]);

  // コンテキストアクション
  const getPrimaryAction = () => {
    if (metrics.overdueCount > 0) {
      return {
        label: `期限切れタスク ${metrics.overdueCount}件を確認`,
        variant: 'destructive' as const,
        icon: AlertTriangle,
        action: onNavigateToTasks,
        urgent: true
      };
    }
    
    if (metrics.todayTasks > 0) {
      return {
        label: `今日のタスク ${metrics.todayTasks}件に取り組む`,
        variant: 'default' as const,
        icon: Target,
        action: onNavigateToTasks,
        urgent: false
      };
    }

    return {
      label: '新しいタスクを作成',
      variant: 'default' as const,
      icon: Plus,
      action: onCreateTask,
      urgent: false
    };
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className="space-y-8">
      {/* ヒーローセクション */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}
        </h1>
        
        {/* メインアクション */}
        <div className="flex justify-center">
          <Button
            onClick={primaryAction.action}
            variant={primaryAction.variant}
            size="lg"
            className={`
              px-8 py-3 text-lg font-semibold transition-all duration-200
              ${primaryAction.urgent ? 'animate-pulse shadow-lg' : 'hover:scale-105'}
            `}
          >
            <primaryAction.icon className="mr-2 h-5 w-5" />
            {primaryAction.label}
          </Button>
        </div>
      </div>

      {/* メトリクスカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">今日</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.todayTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden ${metrics.overdueCount > 0 ? 'ring-2 ring-red-200 bg-red-50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className={`h-5 w-5 ${metrics.overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm font-medium text-gray-600">期限切れ</p>
                <p className={`text-2xl font-bold ${metrics.overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {metrics.overdueCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">進行中</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">完了率</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.completionRate}%</p>
              </div>
            </div>
            <Progress value={metrics.completionRate} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* 緊急タスクまたは今日のハイライト */}
      {urgentTasks.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              注意が必要なタスク
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  <p className="text-xs text-gray-600">
                    {task.due_date && `期限: ${new Date(task.due_date).toLocaleDateString('ja-JP')}`}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.priority === 'urgent' 
                      ? 'bg-red-100 text-red-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {task.priority === 'urgent' ? '緊急' : '重要'}
                  </span>
                </div>
              </div>
            ))}
            <Button 
              variant="outline" 
              onClick={onNavigateToTasks}
              className="w-full mt-4"
            >
              すべてのタスクを確認
            </Button>
          </CardContent>
        </Card>
      )}

      {/* クイックアクション（簡潔版） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onNavigateToCalendar}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">週間ビュー</h3>
                <p className="text-sm text-gray-600">スケジュール全体を確認</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onCreateTask}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Plus className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">クイック追加</h3>
                <p className="text-sm text-gray-600">新しいタスクを作成</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 進捗サマリー */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
              今週の進捗
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>完了したタスク</span>
                <span>{tasks.filter(t => t.status === 'completed').length}/{tasks.length}</span>
              </div>
              <Progress value={metrics.completionRate} className="h-2" />
              <p className="text-xs text-gray-600 text-center">
                {metrics.completionRate >= 80 
                  ? '素晴らしい進捗です！ 🎉' 
                  : metrics.completionRate >= 50 
                  ? '順調に進んでいます 👍' 
                  : 'もう少し頑張りましょう 💪'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}