'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { LoginForm } from '@/components/auth/login-form';
import { Header } from '@/components/layout/header';
import { TaskList } from '@/components/tasks/task-list';
import { useTasks } from '@/hooks/use-tasks';
import { Loader2, Layout, Calendar, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskFormData, TaskFilters, TaskSortOptions } from '@/types/tasks';
import { useToast } from '@/hooks/use-toast';
import { CalendarView } from '@/components/calendar/calendar-view';
import { CalendarErrorWrapper } from '@/components/calendar/calendar-error-boundary';
import { GoogleCalendarSettings } from '@/components/google-calendar/google-calendar-settings';

export default function HomePage(): JSX.Element {
  const { user, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filters, setFilters] = useState<TaskFilters>({});
  const [sort, setSort] = useState<TaskSortOptions>({ field: 'created_at', direction: 'desc' });
  
  const {
    tasks,
    loading: tasksLoading,
    createTask,
    updateTask,
    deleteTask
  } = useTasks(filters, sort);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const handleCreateTask = async (data: TaskFormData) => {
    const result = await createTask(data);
    if (result) {
      toast({
        title: "成功",
        description: "タスクが作成されました",
      });
    }
  };

  const handleUpdateTask = async (taskId: string, data: Partial<TaskFormData>) => {
    const result = await updateTask(taskId, data);
    if (result) {
      toast({
        title: "成功", 
        description: "タスクが更新されました",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const result = await deleteTask(taskId);
    if (result) {
      toast({
        title: "成功",
        description: "タスクが削除されました",
      });
    }
  };

  const handleStatusChange = async (taskId: string, status: any) => {
    const result = await updateTask(taskId, { status });
    if (result) {
      toast({
        title: "ステータス更新",
        description: "タスクのステータスが更新されました",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              ダッシュボード
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              タスク管理
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              カレンダー
            </TabsTrigger>
            <TabsTrigger value="google-calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Google連携
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6 space-y-6">
            <div className="text-center">
              <h2 className="mb-4 text-3xl font-bold text-gray-900">
                ダッシュボード
              </h2>
              <p className="mb-8 text-gray-600">TaskShoot Calendarへようこそ！</p>
            </div>

            {/* クイックアクセスカード */}
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold">タスク管理</h3>
                <p className="text-sm text-gray-600 mb-4">
                  効率的なタスク管理で生産性を向上
                </p>
                <Button 
                  onClick={() => setActiveTab('tasks')}
                  className="w-full"
                >
                  タスクを管理
                </Button>
              </div>

              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold">カレンダー表示</h3>
                <p className="text-sm text-gray-600 mb-4">
                  直感的なカレンダーUIでタスクを視覚的に管理
                </p>
                <Button 
                  onClick={() => setActiveTab('calendar')}
                  className="w-full"
                >
                  カレンダーを開く
                </Button>
              </div>

              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold">Google連携</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Googleカレンダーとの双方向同期
                </p>
                <Button 
                  onClick={() => setActiveTab('google-calendar')}
                  className="w-full"
                >
                  同期設定
                </Button>
              </div>
            </div>

            {/* 最新タスクのプレビュー */}
            {tasks.length > 0 && (
              <div className="mx-auto max-w-4xl">
                <h3 className="mb-4 text-xl font-semibold">最近のタスク</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasks.slice(0, 6).map((task) => (
                    <div key={task.id} className="rounded-lg border bg-white p-4 shadow-sm">
                      <h4 className="font-medium text-sm mb-2">{task.title}</h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {task.description && task.description.length > 50 
                          ? `${task.description.substring(0, 50)}...` 
                          : task.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          task.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : task.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status === 'completed' ? '完了' :
                           task.status === 'in_progress' ? '進行中' : '未着手'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          task.priority === 'urgent' 
                            ? 'bg-red-100 text-red-800'
                            : task.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {task.priority === 'urgent' ? '緊急' :
                           task.priority === 'high' ? '高' :
                           task.priority === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab('tasks')}
                  >
                    すべてのタスクを表示
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <TaskList
              tasks={tasks}
              loading={tasksLoading}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onFiltersChange={setFilters}
              onSortChange={setSort}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">カレンダー</h2>
                <div className="text-sm text-gray-600">
                  {tasks.length} 件のタスクを表示中
                </div>
              </div>
              
              <CalendarErrorWrapper>
                <CalendarView
                  tasks={tasks}
                  loading={tasksLoading}
                  error={null}
                  onEventSelect={(event) => {
                    // イベント選択時の処理（詳細モーダルで処理）
                    // イベント選択はカレンダーコンポーネント内で処理
                    void event
                  }}
                  onEventCreate={(eventData) => {
                    // カレンダーからのタスク作成（作成モーダルで処理）
                    // イベント作成はカレンダーコンポーネント内で処理
                    void eventData
                  }}
                  onTaskCreate={handleCreateTask}
                  onTaskUpdate={async (taskId, data) => {
                    const result = await updateTask(taskId, data)
                    if (result) {
                      toast({
                        title: "更新完了",
                        description: "タスクが更新されました",
                      })
                    }
                  }}
                  onTaskDelete={async (taskId) => {
                    const result = await deleteTask(taskId)
                    if (result) {
                      toast({
                        title: "削除完了",
                        description: "タスクが削除されました",
                      })
                    }
                  }}
                  settings={{
                    defaultView: 'month',
                    showWeekends: true,
                    startOfWeek: 1, // 月曜始まり
                  }}
                  filters={{
                    priorities: filters.priority,
                    statuses: filters.status,
                    categories: filters.category_id,
                    showCompleted: !filters.status?.includes('completed'),
                  }}
                  className="bg-white rounded-lg shadow-sm border"
                />
              </CalendarErrorWrapper>
            </div>
          </TabsContent>

          <TabsContent value="google-calendar" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Google Calendar 連携</h2>
                <div className="text-sm text-gray-600">
                  カレンダーとタスクの同期設定
                </div>
              </div>
              
              <GoogleCalendarSettings />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
