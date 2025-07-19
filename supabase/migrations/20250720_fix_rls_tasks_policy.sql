-- Fix RLS Policy Error for Tasks Table
-- Issue: "new row violates row-level security policy for table tasks"
-- Solution: Re-create RLS policies with proper auth handling

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

-- 2. Re-create policies with improved auth handling
CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

-- 3. Also fix categories table for consistency
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;

CREATE POLICY "Users can view own categories" ON public.categories
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

CREATE POLICY "Users can insert own categories" ON public.categories
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

CREATE POLICY "Users can update own categories" ON public.categories
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete own categories" ON public.categories
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

-- 4. Verify RLS is enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 5. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;

-- 6. Test function to verify policy works
CREATE OR REPLACE FUNCTION test_task_insert(test_title TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    test_task_id UUID;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user found';
        RETURN FALSE;
    END IF;
    
    -- Try to insert a test task
    INSERT INTO public.tasks (user_id, title, description)
    VALUES (current_user_id, test_title, 'Test task for RLS verification')
    RETURNING id INTO test_task_id;
    
    -- Clean up test task
    DELETE FROM public.tasks WHERE id = test_task_id;
    
    RAISE NOTICE 'RLS test successful for user: %', current_user_id;
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS test failed: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Completion message
SELECT 'RLS Policy Fix Applied Successfully' as result;