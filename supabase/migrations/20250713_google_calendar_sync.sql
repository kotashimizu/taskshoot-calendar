-- Google Calendar連携用のテーブル作成

-- Google Calendar設定テーブル
CREATE TABLE IF NOT EXISTS google_calendar_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    access_token TEXT,
    refresh_token TEXT,
    selected_calendars JSONB DEFAULT '[]'::jsonb,
    sync_frequency TEXT NOT NULL DEFAULT '15min' CHECK (sync_frequency IN ('manual', '5min', '15min', '30min', '1hour')),
    sync_direction TEXT NOT NULL DEFAULT 'both' CHECK (sync_direction IN ('both', 'gcal_to_taskshoot', 'taskshoot_to_gcal')),
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT NOT NULL DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'success')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 同期ログテーブル
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'automatic')),
    direction TEXT NOT NULL CHECK (direction IN ('import', 'export', 'bidirectional')),
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    events_processed INTEGER NOT NULL DEFAULT 0,
    events_created INTEGER NOT NULL DEFAULT 0,
    events_updated INTEGER NOT NULL DEFAULT 0,
    events_deleted INTEGER NOT NULL DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Google Calendarイベント同期テーブル
CREATE TABLE IF NOT EXISTS google_event_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL,
    google_calendar_id TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, google_event_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_google_calendar_configs_user_id ON google_calendar_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_google_event_sync_user_id ON google_event_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_google_event_sync_task_id ON google_event_sync(task_id);
CREATE INDEX IF NOT EXISTS idx_google_event_sync_google_event_id ON google_event_sync(google_event_id);

-- RLS (Row Level Security) ポリシー設定
ALTER TABLE google_calendar_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_event_sync ENABLE ROW LEVEL SECURITY;

-- Google Calendar設定テーブルのRLSポリシー
CREATE POLICY "Users can view own google calendar config" ON google_calendar_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google calendar config" ON google_calendar_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google calendar config" ON google_calendar_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own google calendar config" ON google_calendar_configs
    FOR DELETE USING (auth.uid() = user_id);

-- 同期ログテーブルのRLSポリシー
CREATE POLICY "Users can view own sync logs" ON sync_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync logs" ON sync_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Google イベント同期テーブルのRLSポリシー
CREATE POLICY "Users can view own google event sync" ON google_event_sync
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google event sync" ON google_event_sync
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google event sync" ON google_event_sync
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own google event sync" ON google_event_sync
    FOR DELETE USING (auth.uid() = user_id);

-- updated_at自動更新用の関数とトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガー設定
CREATE TRIGGER update_google_calendar_configs_updated_at 
    BEFORE UPDATE ON google_calendar_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_event_sync_updated_at 
    BEFORE UPDATE ON google_event_sync 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Google Calendar設定の初期データ挿入関数
CREATE OR REPLACE FUNCTION create_default_google_calendar_config(user_uuid UUID)
RETURNS google_calendar_configs AS $$
DECLARE
    new_config google_calendar_configs;
BEGIN
    INSERT INTO google_calendar_configs (user_id)
    VALUES (user_uuid)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO new_config;
    
    IF new_config.id IS NULL THEN
        SELECT * INTO new_config FROM google_calendar_configs WHERE user_id = user_uuid;
    END IF;
    
    RETURN new_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 同期統計を取得する関数
CREATE OR REPLACE FUNCTION get_sync_stats(user_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    total_syncs BIGINT,
    successful_syncs BIGINT,
    failed_syncs BIGINT,
    events_processed BIGINT,
    last_sync_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_syncs,
        COUNT(*) FILTER (WHERE status = 'success') as successful_syncs,
        COUNT(*) FILTER (WHERE status = 'error') as failed_syncs,
        COALESCE(SUM(events_processed), 0) as events_processed,
        MAX(started_at) as last_sync_at
    FROM sync_logs 
    WHERE user_id = user_uuid 
    AND started_at >= (NOW() - INTERVAL '1 day' * days_back);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 古い同期ログを削除する関数（保守用）
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sync_logs 
    WHERE started_at < (NOW() - INTERVAL '1 day' * days_to_keep);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;