/**
 * シンプルなカレンダーコンポーネント
 * react-big-calendarの問題を回避するためのフォールバック
 */

'use client';

import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths,
  addDays
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { TaskWithCategory } from '@/types/tasks';

interface SimpleCalendarProps {
  tasks: TaskWithCategory[];
  loading?: boolean;
  error?: Error | null;
  className?: string;
}

interface CalendarDay {
  date: Date;
  tasks: TaskWithCategory[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function SimpleCalendar({ tasks = [], loading = false, error = null, className = '' }: SimpleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // カレンダーの日付とタスクを計算
  const calendarData = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    // Generate days manually instead of using eachDayOfInterval
    const days: Date[] = [];
    let currentDay = start;
    while (currentDay <= end) {
      days.push(new Date(currentDay));
      currentDay = addDays(currentDay, 1);
    }

    return days.map((date): CalendarDay => {
      const dayTasks = tasks.filter(task => {
        if (!task.due_date) return false;
        try {
          const taskDate = new Date(task.due_date);
          return isSameDay(taskDate, date);
        } catch {
          return false;
        }
      });

      return {
        date,
        tasks: dayTasks,
        isCurrentMonth: isSameMonth(date, currentDate),
        isToday: isToday(date),
      };
    });
  }, [currentDate, tasks]);

  const handlePreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Calendar className="h-8 w-8 animate-pulse mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">カレンダーを読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-red-400" />
            <p className="text-sm text-red-600">カレンダーの読み込みに失敗しました</p>
            <p className="text-xs text-gray-500 mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            {format(currentDate, 'yyyy年M月')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="text-xs"
            >
              今日
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['月', '火', '水', '木', '金', '土', '日'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.map((day: CalendarDay, index: number) => (
            <div
              key={index}
              className={`
                min-h-[80px] p-1 border border-gray-200 rounded-sm
                ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                ${day.isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                hover:bg-gray-50 transition-colors
              `}
            >
              {/* 日付 */}
              <div className={`
                text-sm font-medium mb-1
                ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                ${day.isToday ? 'text-blue-600 font-bold' : ''}
              `}>
                {format(day.date, 'd')}
              </div>

              {/* タスク */}
              <div className="space-y-1">
                {day.tasks.slice(0, 2).map((task: TaskWithCategory) => (
                  <div
                    key={task.id}
                    className={`
                      text-xs p-1 rounded border
                      ${getStatusColor(task.status)}
                      truncate
                    `}
                    title={`${task.title} (${task.priority})`}
                  >
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                      <span className="truncate">{task.title}</span>
                    </div>
                  </div>
                ))}
                
                {day.tasks.length > 2 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{day.tasks.length - 2}件
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 統計情報 */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>今月のタスク: {tasks.length}件</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                完了: {tasks.filter(t => t.status === 'completed').length}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                進行中: {tasks.filter(t => t.status === 'in_progress').length}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full" />
                未着手: {tasks.filter(t => t.status === 'pending').length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}