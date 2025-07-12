-- Create categories table for task categorization
-- This table manages task categories for organization

CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6', -- Default blue color
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique category names per user
  UNIQUE(user_id, name)
);

-- Create tasks table for task management
-- This table stores all user tasks with comprehensive metadata

CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  
  -- Basic task information
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Date and time management
  due_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Time estimation and tracking (for TaskShoot functionality)
  estimated_minutes INTEGER DEFAULT 0 CHECK (estimated_minutes >= 0),
  actual_minutes INTEGER DEFAULT 0 CHECK (actual_minutes >= 0),
  
  -- Task metadata
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB, -- Store recurrence configuration
  
  -- Google Calendar integration
  google_calendar_event_id TEXT,
  google_calendar_synced_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Performance indexes
  CONSTRAINT tasks_title_length CHECK (length(title) > 0 AND length(title) <= 500),
  CONSTRAINT tasks_description_length CHECK (length(description) <= 5000)
);

-- Create updated_at triggers for both tables
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS) for both tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories table
-- Users can only see their own categories
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own categories
CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own categories
CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own categories
CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for tasks table
-- Users can only see their own tasks
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tasks
CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Create performance indexes
CREATE INDEX categories_user_id_idx ON public.categories(user_id);
CREATE INDEX categories_name_idx ON public.categories(user_id, name);
CREATE INDEX categories_sort_order_idx ON public.categories(user_id, sort_order);

CREATE INDEX tasks_user_id_idx ON public.tasks(user_id);
CREATE INDEX tasks_category_id_idx ON public.tasks(category_id);
CREATE INDEX tasks_status_idx ON public.tasks(user_id, status);
CREATE INDEX tasks_priority_idx ON public.tasks(user_id, priority);
CREATE INDEX tasks_due_date_idx ON public.tasks(user_id, due_date);
CREATE INDEX tasks_created_at_idx ON public.tasks(user_id, created_at);
CREATE INDEX tasks_updated_at_idx ON public.tasks(user_id, updated_at);
CREATE INDEX tasks_title_search_idx ON public.tasks USING gin(to_tsvector('japanese', title));

-- Create default categories for new users
CREATE OR REPLACE FUNCTION public.create_default_categories(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, description, color, icon, sort_order) VALUES
    (p_user_id, '仕事', '仕事関連のタスク', '#EF4444', '💼', 1),
    (p_user_id, '個人', '個人的なタスク', '#10B981', '👤', 2),
    (p_user_id, '学習', '学習・スキルアップ', '#8B5CF6', '📚', 3),
    (p_user_id, '健康', '健康・運動関連', '#F59E0B', '💪', 4),
    (p_user_id, 'その他', 'その他のタスク', '#6B7280', '📝', 5);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create default categories on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default categories for the new user
  PERFORM public.create_default_categories(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default categories on user signup
CREATE TRIGGER on_auth_user_created_categories
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_categories();

-- Create function for task statistics
CREATE OR REPLACE FUNCTION public.get_task_stats(p_user_id UUID)
RETURNS TABLE(
  total_tasks BIGINT,
  completed_tasks BIGINT,
  pending_tasks BIGINT,
  in_progress_tasks BIGINT,
  overdue_tasks BIGINT,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
    COUNT(*) FILTER (WHERE status != 'completed' AND due_date < NOW()) as overdue_tasks,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
    END as completion_rate
  FROM public.tasks 
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;