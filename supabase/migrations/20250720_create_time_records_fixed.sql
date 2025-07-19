-- TaskShoot Phase 5: リアルタイム時間計測機能（修正版）
-- time_records テーブル作成
-- 作成日: 2025-07-20 (修正版)

-- 既存テーブルを削除（クリーンスタート）
DROP TABLE IF EXISTS public.time_sessions CASCADE;
DROP TABLE IF EXISTS public.time_records CASCADE;
DROP VIEW IF EXISTS public.time_tracking_stats CASCADE;

-- 1. time_records テーブル作成
CREATE TABLE public.time_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    
    -- 時間管理
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ NULL,
    paused_at TIMESTAMPTZ NULL,
    total_paused_duration INTERVAL DEFAULT '0 seconds'::INTERVAL,
    
    -- 計測状態
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    
    -- 作業記録
    work_session_type TEXT DEFAULT 'normal' CHECK (work_session_type IN ('normal', 'focus', 'break', 'review')),
    interruption_count INTEGER DEFAULT 0,
    focus_score INTEGER CHECK (focus_score >= 1 AND focus_score <= 10),
    notes TEXT,
    
    -- メタデータ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT valid_time_range CHECK (ended_at IS NULL OR ended_at >= started_at),
    CONSTRAINT valid_pause_state CHECK (
        (status = 'paused' AND paused_at IS NOT NULL) OR 
        (status != 'paused' AND paused_at IS NULL)
    )
);

-- 2. time_sessions テーブル作成
CREATE TABLE public.time_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    time_record_id UUID NOT NULL REFERENCES public.time_records(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- セッション詳細
    session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_end TIMESTAMPTZ NULL,
    session_type TEXT NOT NULL DEFAULT 'work' CHECK (session_type IN ('work', 'break', 'interruption')),
    
    -- 中断・再開記録
    interruption_reason TEXT,
    productivity_rating INTEGER CHECK (productivity_rating >= 1 AND productivity_rating <= 5),
    
    -- メタデータ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT valid_session_range CHECK (session_end IS NULL OR session_end >= session_start)
);

-- 3. インデックス作成（テーブル作成後）
CREATE INDEX idx_time_records_user_id ON public.time_records(user_id);
CREATE INDEX idx_time_records_task_id ON public.time_records(task_id);
CREATE INDEX idx_time_records_status ON public.time_records(status);
CREATE INDEX idx_time_records_started_at ON public.time_records(started_at);
CREATE INDEX idx_time_records_user_task ON public.time_records(user_id, task_id);

CREATE INDEX idx_time_sessions_record_id ON public.time_sessions(time_record_id);
CREATE INDEX idx_time_sessions_user_id ON public.time_sessions(user_id);
CREATE INDEX idx_time_sessions_start ON public.time_sessions(session_start);

-- 4. Row Level Security (RLS) 設定
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_sessions ENABLE ROW LEVEL SECURITY;

-- 4.1 time_records RLS ポリシー
CREATE POLICY "Users can view own time records" ON public.time_records
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own time records" ON public.time_records
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own time records" ON public.time_records
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own time records" ON public.time_records
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 4.2 time_sessions RLS ポリシー
CREATE POLICY "Users can view own time sessions" ON public.time_sessions
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own time sessions" ON public.time_sessions
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own time sessions" ON public.time_sessions
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own time sessions" ON public.time_sessions
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 5. トリガー関数（updated_at 自動更新）
CREATE OR REPLACE FUNCTION update_time_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_time_records_updated_at
    BEFORE UPDATE ON public.time_records
    FOR EACH ROW
    EXECUTE FUNCTION update_time_records_updated_at();

-- 6. 計算関数
CREATE OR REPLACE FUNCTION calculate_actual_work_time(record_id UUID)
RETURNS INTERVAL AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    paused_duration INTERVAL;
    actual_duration INTERVAL;
BEGIN
    SELECT started_at, ended_at, total_paused_duration
    INTO start_time, end_time, paused_duration
    FROM public.time_records
    WHERE id = record_id;
    
    IF start_time IS NULL THEN
        RETURN '0 seconds'::INTERVAL;
    END IF;
    
    IF end_time IS NULL THEN
        -- 進行中の場合は現在時刻まで
        end_time := NOW();
    END IF;
    
    actual_duration := (end_time - start_time) - COALESCE(paused_duration, '0 seconds'::INTERVAL);
    
    RETURN GREATEST(actual_duration, '0 seconds'::INTERVAL);
END;
$$ LANGUAGE plpgsql;

-- 7. 進行中タスクチェック制約（一人一タスクのみ）
CREATE OR REPLACE FUNCTION check_single_active_task()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        -- 同一ユーザーの他のactiveタスクをチェック
        IF EXISTS (
            SELECT 1 FROM public.time_records 
            WHERE user_id = NEW.user_id 
            AND status = 'active' 
            AND id != COALESCE(NEW.id, gen_random_uuid())
        ) THEN
            RAISE EXCEPTION 'Cannot have multiple active time records simultaneously';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_single_active_task
    BEFORE INSERT OR UPDATE ON public.time_records
    FOR EACH ROW
    EXECUTE FUNCTION check_single_active_task();

-- 8. 統計ビュー作成
CREATE VIEW public.time_tracking_stats AS
SELECT 
    tr.user_id,
    tr.task_id,
    t.title as task_title,
    COUNT(*) as session_count,
    EXTRACT(EPOCH FROM SUM(calculate_actual_work_time(tr.id))) / 3600 as total_hours,
    AVG(tr.focus_score) as avg_focus_score,
    AVG(tr.interruption_count) as avg_interruptions,
    MIN(tr.started_at) as first_session,
    MAX(COALESCE(tr.ended_at, tr.started_at)) as last_session
FROM public.time_records tr
JOIN public.tasks t ON tr.task_id = t.id
WHERE tr.status IN ('completed', 'cancelled')
GROUP BY tr.user_id, tr.task_id, t.title;

-- 9. ビューRLS設定（PostgreSQL 15+ の場合）
-- ALTER VIEW public.time_tracking_stats SET (security_barrier = true);

-- 10. 権限設定
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_sessions TO authenticated;
GRANT SELECT ON public.time_tracking_stats TO authenticated;

-- 完了メッセージ
SELECT 'TaskShoot Phase 5: time_records テーブル作成完了 (修正版)' as result;