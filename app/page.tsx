'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { LoginForm } from '@/components/auth/login-form';
import { Header } from '@/components/layout/header';
import { TaskList } from '@/components/tasks/task-list';
import { useTasks } from '@/hooks/use-tasks';
import { Loader2, Layout, Calendar, Settings, Timer } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskFormData, TaskFilters, TaskSortOptions } from '@/types/tasks';
import { useToast } from '@/hooks/use-toast';
import { SimpleCalendar } from '@/components/calendar/simple-calendar';
import { GoogleCalendarSettings } from '@/components/google-calendar/google-calendar-settings';
import { EnhancedDashboard } from '@/components/dashboard/enhanced-dashboard';
import { TimerDashboard } from '@/components/taskshoot/timer-dashboard';

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              ダッシュボード
            </TabsTrigger>
            <TabsTrigger value="taskshoot" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              TaskShoot
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

          <TabsContent value="dashboard" className="mt-6">
            <EnhancedDashboard
              tasks={tasks}
              onNavigateToTasks={() => setActiveTab('tasks')}
              onNavigateToCalendar={() => setActiveTab('calendar')}
              onCreateTask={() => setActiveTab('tasks')}
            />
          </TabsContent>

          <TabsContent value="taskshoot" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Timer className="h-6 w-6" />
                  TaskShoot - 時間計測
                </h2>
                <div className="text-sm text-gray-600">
                  時間を可視化し、生産性を最大化
                </div>
              </div>
              
              <TimerDashboard tasks={tasks} />
            </div>
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
              
              <SimpleCalendar
                tasks={tasks}
                loading={tasksLoading}
                error={null}
                className="bg-white rounded-lg shadow-sm border"
              />
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
