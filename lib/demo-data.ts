/**
 * デモモード用のサンプルデータ
 */

import { TaskWithCategory, Category, TaskStats } from '@/types/tasks';

export const DEMO_CATEGORIES: Category[] = [
  {
    id: 'demo-cat-1',
    user_id: 'demo-user',
    name: '仕事',
    description: '業務関連のタスク',
    color: '#3B82F6',
    icon: '💼',
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-cat-2',
    user_id: 'demo-user',
    name: '個人',
    description: 'プライベートなタスク',
    color: '#10B981',
    icon: '🏠',
    sort_order: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-cat-3',
    user_id: 'demo-user',
    name: '学習',
    description: '勉強・スキルアップ',
    color: '#8B5CF6',
    icon: '📚',
    sort_order: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const DEMO_TASKS: TaskWithCategory[] = [
  {
    id: 'demo-task-1',
    user_id: 'demo-user',
    category_id: 'demo-cat-1',
    title: 'プロジェクト企画書作成',
    description: '新規プロジェクトの企画書を作成する',
    status: 'in_progress',
    priority: 'high',
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3日後
    start_date: new Date().toISOString(),
    completed_at: null,
    estimated_minutes: 120,
    actual_minutes: 0,
    tags: ['企画', '重要'],
    notes: 'プレゼンテーション用のスライドも含める',
    is_recurring: false,
    recurrence_pattern: null,
    google_calendar_event_id: null,
    google_calendar_synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: DEMO_CATEGORIES[0],
  },
  {
    id: 'demo-task-2',
    user_id: 'demo-user',
    category_id: 'demo-cat-1',
    title: 'チームミーティング準備',
    description: '週次ミーティングのアジェンダを準備',
    status: 'pending',
    priority: 'medium',
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 明日
    start_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: null,
    estimated_minutes: 30,
    actual_minutes: 0,
    tags: ['ミーティング'],
    notes: '',
    is_recurring: true,
    recurrence_pattern: 'weekly',
    google_calendar_event_id: null,
    google_calendar_synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: DEMO_CATEGORIES[0],
  },
  {
    id: 'demo-task-3',
    user_id: 'demo-user',
    category_id: 'demo-cat-2',
    title: '買い物',
    description: '週末の買い物リスト作成と実行',
    status: 'pending',
    priority: 'low',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5日後
    start_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: null,
    estimated_minutes: 90,
    actual_minutes: 0,
    tags: ['買い物', '日用品'],
    notes: '牛乳、パン、野菜を忘れずに',
    is_recurring: false,
    recurrence_pattern: null,
    google_calendar_event_id: null,
    google_calendar_synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: DEMO_CATEGORIES[1],
  },
  {
    id: 'demo-task-4',
    user_id: 'demo-user',
    category_id: 'demo-cat-3',
    title: 'Next.js学習',
    description: 'Next.js 14の新機能を学習する',
    status: 'completed',
    priority: 'medium',
    due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 昨日
    start_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_minutes: 180,
    actual_minutes: 210,
    tags: ['学習', 'プログラミング'],
    notes: 'App Routerとサーバーコンポーネントに重点を置く',
    is_recurring: false,
    recurrence_pattern: null,
    google_calendar_event_id: null,
    google_calendar_synced_at: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    category: DEMO_CATEGORIES[2],
  },
  {
    id: 'demo-task-5',
    user_id: 'demo-user',
    category_id: 'demo-cat-1',
    title: 'バグ修正',
    description: 'ユーザー認証関連のバグを修正',
    status: 'in_progress',
    priority: 'urgent',
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    start_date: new Date().toISOString(),
    completed_at: null,
    estimated_minutes: 60,
    actual_minutes: 0,
    tags: ['バグ修正', '緊急'],
    notes: 'セッション管理の問題を調査',
    is_recurring: false,
    recurrence_pattern: null,
    google_calendar_event_id: null,
    google_calendar_synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: DEMO_CATEGORIES[0],
  },
];

export const DEMO_STATS: TaskStats = {
  total_tasks: DEMO_TASKS.length,
  pending_tasks: DEMO_TASKS.filter(t => t.status === 'pending').length,
  in_progress_tasks: DEMO_TASKS.filter(t => t.status === 'in_progress').length,
  completed_tasks: DEMO_TASKS.filter(t => t.status === 'completed').length,
  overdue_tasks: DEMO_TASKS.filter(t => 
    t.due_date && 
    new Date(t.due_date) < new Date() && 
    t.status !== 'completed'
  ).length,
  completion_rate: Math.round(
    (DEMO_TASKS.filter(t => t.status === 'completed').length / DEMO_TASKS.length) * 100
  ),
};

/**
 * デモモード用のタスクCRUD操作
 */
const demoTasksState = [...DEMO_TASKS];
let demoId = 1000;

export const demoTaskOperations = {
  // タスク取得
  getTasks: (filters?: any, sort?: any): Promise<TaskWithCategory[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filteredTasks = [...demoTasksState];
        
        // フィルター適用
        if (filters?.status) {
          filteredTasks = filteredTasks.filter(task => 
            Array.isArray(filters.status) 
              ? filters.status.includes(task.status)
              : task.status === filters.status
          );
        }
        
        if (filters?.priority) {
          filteredTasks = filteredTasks.filter(task => 
            Array.isArray(filters.priority)
              ? filters.priority.includes(task.priority)
              : task.priority === filters.priority
          );
        }

        if (filters?.category_id) {
          filteredTasks = filteredTasks.filter(task => 
            Array.isArray(filters.category_id)
              ? filters.category_id.includes(task.category_id)
              : task.category_id === filters.category_id
          );
        }
        
        // ソート適用
        if (sort?.field) {
          filteredTasks.sort((a, b) => {
            const aVal = a[sort.field as keyof TaskWithCategory];
            const bVal = b[sort.field as keyof TaskWithCategory];
            
            // null/undefined対応
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return sort.direction === 'asc' ? -1 : 1;
            if (bVal == null) return sort.direction === 'asc' ? 1 : -1;
            
            if (sort.direction === 'asc') {
              return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
              return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
          });
        }
        
        resolve(filteredTasks);
      }, 300);
    });
  },

  // タスク作成
  createTask: (data: any): Promise<TaskWithCategory> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newTask: TaskWithCategory = {
          id: `demo-task-${demoId++}`,
          user_id: 'demo-user',
          category_id: data.category_id || 'demo-cat-1',
          title: data.title,
          description: data.description || '',
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          due_date: data.due_date || null,
          start_date: data.start_date || null,
          completed_at: null,
          estimated_minutes: data.estimated_minutes || null,
          actual_minutes: 0,
          tags: data.tags || [],
          notes: data.notes || '',
          is_recurring: data.is_recurring || false,
          recurrence_pattern: data.recurrence_pattern || null,
          google_calendar_event_id: null,
          google_calendar_synced_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category: DEMO_CATEGORIES.find(c => c.id === (data.category_id || 'demo-cat-1')) || DEMO_CATEGORIES[0],
        };
        
        demoTasksState.push(newTask);
        resolve(newTask);
      }, 500);
    });
  },

  // タスク更新
  updateTask: (id: string, data: any): Promise<TaskWithCategory> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const taskIndex = demoTasksState.findIndex(task => task.id === id);
        if (taskIndex === -1) {
          reject(new Error('Task not found'));
          return;
        }
        
        const updatedTask = {
          ...demoTasksState[taskIndex],
          ...data,
          updated_at: new Date().toISOString(),
        };
        
        if (data.status === 'completed' && !updatedTask.completed_at) {
          updatedTask.completed_at = new Date().toISOString();
        }
        
        demoTasksState[taskIndex] = updatedTask;
        resolve(updatedTask);
      }, 500);
    });
  },

  // タスク削除
  deleteTask: (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const taskIndex = demoTasksState.findIndex(task => task.id === id);
        if (taskIndex === -1) {
          reject(new Error('Task not found'));
          return;
        }
        
        demoTasksState.splice(taskIndex, 1);
        resolve();
      }, 300);
    });
  },

  // 統計取得
  getStats: (): Promise<TaskStats> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stats: TaskStats = {
          total_tasks: demoTasksState.length,
          pending_tasks: demoTasksState.filter(t => t.status === 'pending').length,
          in_progress_tasks: demoTasksState.filter(t => t.status === 'in_progress').length,
          completed_tasks: demoTasksState.filter(t => t.status === 'completed').length,
          overdue_tasks: demoTasksState.filter(t => 
            t.due_date && 
            new Date(t.due_date) < new Date() && 
            t.status !== 'completed'
          ).length,
          completion_rate: demoTasksState.length > 0 ? Math.round(
            (demoTasksState.filter(t => t.status === 'completed').length / demoTasksState.length) * 100
          ) : 0,
        };
        resolve(stats);
      }, 200);
    });
  },
};

export const demoCategoryOperations = {
  getCategories: (): Promise<Category[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...DEMO_CATEGORIES]), 200);
    });
  },
};