'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { LoginForm } from '@/components/auth/login-form';
import { Header } from '@/components/layout/header';
import { useTasks } from '@/hooks/use-tasks';
import { Loader2, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskFilters, TaskSortOptions } from '@/types/tasks';
import { SimpleCalendar } from '@/components/calendar/simple-calendar';
import { TimerDashboard } from '@/components/taskshoot/timer-dashboard';

export default function HomePage(): JSX.Element {
  const { user, loading: authLoading } = useAuthContext();
  const [activeTab, setActiveTab] = useState('taskshoot');
  const [filters] = useState<TaskFilters>({});
  const [sort] = useState<TaskSortOptions>({ field: 'created_at', direction: 'desc' });
  
  const {
    tasks,
    loading: tasksLoading
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="taskshoot" className="flex items-center gap-2">
              TaskShoot
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              カレンダー
            </TabsTrigger>
          </TabsList>

          <TabsContent value="taskshoot" className="mt-6">
            <TimerDashboard tasks={tasks} />
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
        </Tabs>
      </main>
    </div>
  );
}
