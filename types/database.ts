export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          preferences: Json;
          timezone: string;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          timezone?: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          timezone?: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          color: string;
          icon: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          color?: string;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          title: string;
          description: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          due_date: string | null;
          start_date: string | null;
          completed_at: string | null;
          estimated_minutes: number;
          actual_minutes: number;
          tags: string[];
          notes: string | null;
          is_recurring: boolean;
          recurrence_pattern: Json | null;
          google_calendar_event_id: string | null;
          google_calendar_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          title: string;
          description?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          due_date?: string | null;
          start_date?: string | null;
          completed_at?: string | null;
          estimated_minutes?: number;
          actual_minutes?: number;
          tags?: string[];
          notes?: string | null;
          is_recurring?: boolean;
          recurrence_pattern?: Json | null;
          google_calendar_event_id?: string | null;
          google_calendar_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          title?: string;
          description?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          due_date?: string | null;
          start_date?: string | null;
          completed_at?: string | null;
          estimated_minutes?: number;
          actual_minutes?: number;
          tags?: string[];
          notes?: string | null;
          is_recurring?: boolean;
          recurrence_pattern?: Json | null;
          google_calendar_event_id?: string | null;
          google_calendar_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_task_stats: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          total_tasks: number;
          completed_tasks: number;
          pending_tasks: number;
          in_progress_tasks: number;
          overdue_tasks: number;
          completion_rate: number;
        }[];
      };
    };
    Enums: {
      task_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      task_priority: 'low' | 'medium' | 'high' | 'urgent';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
