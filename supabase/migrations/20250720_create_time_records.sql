-- TaskShoot Phase 5: リアルタイム時間計測機能
-- time_records テーブル作成
-- 作成日: 2025-07-20

-- 1. time_records テーブル作成
CREATE TABLE IF NOT EXISTS public.time_records (
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

-- 2. インデックス作成
CREATE INDEX IF NOT EXISTS idx_time_records_user_id ON public.time_records(user_id);
CREATE INDEX IF NOT EXISTS idx_time_records_task_id ON public.time_records(task_id);
CREATE INDEX IF NOT EXISTS idx_time_records_status ON public.time_records(status);
CREATE INDEX IF NOT EXISTS idx_time_records_started_at ON public.time_records(started_at);
CREATE INDEX IF NOT EXISTS idx_time_records_user_task ON public.time_records(user_id, task_id);

-- 3. Row Level Security (RLS) 設定
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;

-- 3.1 ユーザー自身の記録のみ閲覧可能
CREATE POLICY "Users can view own time records" ON public.time_records
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- 3.2 ユーザー自身の記録のみ作成可能
CREATE POLICY "Users can create own time records" ON public.time_records
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3.3 ユーザー自身の記録のみ更新可能
CREATE POLICY "Users can update own time records" ON public.time_records
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3.4 ユーザー自身の記録のみ削除可能
CREATE POLICY "Users can delete own time records" ON public.time_records
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 4. updated_at 自動更新トリガー
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

-- 5. time_sessions テーブル作成（詳細セッション管理）
CREATE TABLE IF NOT EXISTS public.time_sessions (
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

-- 6. time_sessions インデックス
CREATE INDEX IF NOT EXISTS idx_time_sessions_record_id ON public.time_sessions(time_record_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_user_id ON public.time_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_start ON public.time_sessions(session_start);

-- 7. time_sessions RLS設定
ALTER TABLE public.time_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time sessions" ON public.time_sessions
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own time sessions" ON public.time_sessions
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own time sessions" ON public.time_sessions
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own time sessions" ON public.time_sessions
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 8. 便利な計算関数
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
    
    IF end_time IS NULL THEN
        -- 進行中の場合は現在時刻まで
        end_time := NOW();
    END IF;
    
    actual_duration := (end_time - start_time) - COALESCE(paused_duration, '0 seconds'::INTERVAL);
    
    RETURN GREATEST(actual_duration, '0 seconds'::INTERVAL);
END;
$$ LANGUAGE plpgsql;

-- 9. 進行中タスクチェック制約（一人一タスクのみ）
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

-- 10. デフォルトデータ挿入（開発用）
-- tasks テーブルに最低限のデータがある場合のみ実行
DO $$
DECLARE
    sample_user_id UUID;
    sample_task_id UUID;
BEGIN
    -- 既存のユーザーとタスクを確認
    SELECT user_id INTO sample_user_id FROM public.tasks LIMIT 1;
    
    IF sample_user_id IS NOT NULL THEN
        SELECT id INTO sample_task_id FROM public.tasks WHERE user_id = sample_user_id LIMIT 1;
        
        IF sample_task_id IS NOT NULL THEN
            -- サンプル時間記録（完了済み）
            INSERT INTO public.time_records (
                user_id, task_id, started_at, ended_at, status, 
                work_session_type, focus_score, notes
            ) VALUES (
                sample_user_id, 
                sample_task_id, 
                NOW() - INTERVAL '2 hours',
                NOW() - INTERVAL '1 hour',
                'completed',
                'focus',
                8,
                'サンプル作業記録 - 集中して作業完了'
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- 11. 統計ビュー作成
CREATE OR REPLACE VIEW public.time_tracking_stats AS
SELECT 
    tr.user_id,
    tr.task_id,
    t.title as task_title,
    COUNT(*) as session_count,
    SUM(EXTRACT(EPOCH FROM calculate_actual_work_time(tr.id))) / 3600 as total_hours,
    AVG(tr.focus_score) as avg_focus_score,
    AVG(tr.interruption_count) as avg_interruptions,
    MIN(tr.started_at) as first_session,
    MAX(COALESCE(tr.ended_at, tr.started_at)) as last_session
FROM public.time_records tr
JOIN public.tasks t ON tr.task_id = t.id
WHERE tr.status IN ('completed', 'cancelled')
GROUP BY tr.user_id, tr.task_id, t.title;

-- RLS for view
CREATE POLICY "Users can view own tracking stats" ON public.time_tracking_stats
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- 12. 完了確認メッセージ
DO $$
BEGIN
    RAISE NOTICE 'TaskShoot Phase 5: time_records テーブル作成完了';
    RAISE NOTICE '- time_records: リアルタイム時間計測';
    RAISE NOTICE '- time_sessions: 詳細セッション管理';
    RAISE NOTICE '- RLS: セキュリティポリシー適用済み';
    RAISE NOTICE '- インデックス: パフォーマンス最適化済み';
    RAISE NOTICE '- 制約: データ整合性保証済み';
END $$;