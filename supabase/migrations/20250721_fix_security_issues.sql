-- セキュリティ問題の修正
-- 1. SECURITY DEFINER ビューの修正
-- 2. 関数のsearch_path設定追加

-- time_tracking_stats ビューを再作成（SECURITY DEFINERを削除）
DROP VIEW IF EXISTS public.time_tracking_stats CASCADE;

CREATE VIEW public.time_tracking_stats 
WITH (security_barrier = true) AS
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
LEFT JOIN public.tasks t ON tr.task_id = t.id
WHERE tr.user_id = auth.uid()
GROUP BY tr.user_id, tr.task_id, t.title;

-- RLSポリシーの設定
ALTER VIEW public.time_tracking_stats SET (security_barrier = true);
GRANT SELECT ON public.time_tracking_stats TO authenticated;

-- 関数のsearch_path設定を追加
-- update_time_records_updated_at関数
CREATE OR REPLACE FUNCTION public.update_time_records_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- calculate_actual_work_time関数
CREATE OR REPLACE FUNCTION public.calculate_actual_work_time(record_id uuid)
RETURNS INTERVAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    start_time timestamptz;
    end_time timestamptz;
    pause_duration interval := '0 minutes'::interval;
BEGIN
    SELECT started_at, ended_at 
    INTO start_time, end_time
    FROM time_records 
    WHERE id = record_id;
    
    IF start_time IS NULL THEN
        RETURN '0 minutes'::interval;
    END IF;
    
    IF end_time IS NULL THEN
        end_time := NOW();
    END IF;
    
    -- 休憩時間を計算（実装は後で追加）
    SELECT COALESCE(SUM(duration), '0 minutes'::interval)
    INTO pause_duration
    FROM time_record_pauses 
    WHERE time_record_id = record_id;
    
    RETURN (end_time - start_time) - pause_duration;
END;
$$;

-- check_single_active_task関数
CREATE OR REPLACE FUNCTION public.check_single_active_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- アクティブなタスクがある場合は他のタスクを終了
    IF NEW.ended_at IS NULL THEN
        UPDATE time_records 
        SET ended_at = NOW()
        WHERE user_id = NEW.user_id 
        AND ended_at IS NULL 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- test_task_insert関数
CREATE OR REPLACE FUNCTION public.test_task_insert()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- テスト用の関数（実装は必要に応じて）
    RAISE NOTICE 'Test task insert function executed';
END;
$$;

-- コメント追加
COMMENT ON VIEW public.time_tracking_stats IS 'ユーザーの時間追跡統計（セキュリティバリア有効）';
COMMENT ON FUNCTION public.update_time_records_updated_at() IS 'time_recordsテーブルのupdated_at自動更新';
COMMENT ON FUNCTION public.calculate_actual_work_time(uuid) IS '実際の作業時間計算（休憩時間除く）';
COMMENT ON FUNCTION public.check_single_active_task() IS 'アクティブタスクの単一性確保';
COMMENT ON FUNCTION public.test_task_insert() IS 'テスト用タスク挿入関数';