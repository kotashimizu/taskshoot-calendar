-- ================================================
-- Phase 5: タスクシュート機能 - 時間管理テーブル
-- 作成日: 2025-01-13
-- 説明: 時間見積もり・実績記録・分析のためのテーブル群
-- ================================================

-- 時間見積もりテーブル
CREATE TABLE IF NOT EXISTS time_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- 見積もり情報
    estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0),
    confidence_level INTEGER DEFAULT 50 CHECK (confidence_level >= 0 AND confidence_level <= 100),
    estimation_method VARCHAR(50) DEFAULT 'manual', -- manual, historical, ai_suggested, template
    base_estimate INTEGER, -- AI/履歴ベースの基本見積もり
    complexity_factor DECIMAL(3,2) DEFAULT 1.0 CHECK (complexity_factor > 0),
    
    -- メタデータ
    notes TEXT,
    tags TEXT[],
    estimation_context JSONB, -- 見積もり時の追加情報
    
    -- 履歴管理
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    superseded_by UUID REFERENCES time_estimates(id),
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    estimated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- インデックス用
    CONSTRAINT unique_active_estimate_per_task UNIQUE(task_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- 時間記録テーブル  
CREATE TABLE IF NOT EXISTS time_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    time_estimate_id UUID REFERENCES time_estimates(id) ON DELETE SET NULL,
    
    -- 時間記録情報
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN end_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60
            ELSE NULL 
        END
    ) STORED,
    
    -- 記録状態
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    is_break BOOLEAN DEFAULT false,
    break_reason VARCHAR(100),
    
    -- 作業詳細
    work_description TEXT,
    productivity_rating INTEGER CHECK (productivity_rating >= 1 AND productivity_rating <= 5),
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    interruption_count INTEGER DEFAULT 0,
    
    -- デバイス・環境情報
    device_type VARCHAR(50), -- desktop, mobile, tablet
    location_type VARCHAR(50), -- office, home, cafe, etc.
    environment_factors TEXT[], -- noise, distractions, etc.
    
    -- メタデータ
    notes TEXT,
    tags TEXT[],
    record_metadata JSONB,
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time > start_time),
    -- 重複するアクティブレコードの制約（GiSTエクステンション必要）
    -- CONSTRAINT no_overlapping_active_records EXCLUDE USING gist (
    --     user_id WITH =,
    --     tstzrange(start_time, COALESCE(end_time, 'infinity'::timestamptz), '[)') WITH &&
    -- ) WHERE (status = 'active' AND NOT is_break)
);

-- 時間見積もり履歴テーブル
CREATE TABLE IF NOT EXISTS time_estimate_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_estimate_id UUID NOT NULL REFERENCES time_estimates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 変更情報
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('created', 'updated', 'revised', 'confirmed')),
    old_estimated_minutes INTEGER,
    new_estimated_minutes INTEGER,
    reason TEXT,
    
    -- 学習データ
    actual_minutes INTEGER, -- 実績時間（確定時）
    accuracy_percentage DECIMAL(5,2), -- 精度（実績確定時）
    variance_minutes INTEGER, -- 差異（実績 - 見積もり）
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作業セッション集計テーブル
CREATE TABLE IF NOT EXISTS work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- セッション情報
    session_date DATE NOT NULL,
    total_duration_minutes INTEGER NOT NULL DEFAULT 0,
    break_duration_minutes INTEGER NOT NULL DEFAULT 0,
    effective_duration_minutes INTEGER GENERATED ALWAYS AS (
        total_duration_minutes - break_duration_minutes
    ) STORED,
    
    -- セッション統計
    session_count INTEGER NOT NULL DEFAULT 0,
    interruption_count INTEGER NOT NULL DEFAULT 0,
    average_productivity_rating DECIMAL(3,2),
    average_difficulty_rating DECIMAL(3,2),
    
    -- 達成度
    estimated_minutes INTEGER,
    completion_percentage DECIMAL(5,2),
    efficiency_score DECIMAL(5,2), -- (実績/見積もり) * 生産性評価
    
    -- メタデータ
    session_notes TEXT,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT unique_user_task_date UNIQUE(user_id, task_id, session_date),
    CONSTRAINT valid_duration CHECK (total_duration_minutes >= break_duration_minutes)
);

-- 生産性インサイトテーブル
CREATE TABLE IF NOT EXISTS productivity_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- インサイト情報
    insight_type VARCHAR(50) NOT NULL, -- time_pattern, productivity_peak, estimation_bias, etc.
    insight_category VARCHAR(30) NOT NULL, -- performance, pattern, suggestion, warning
    priority_level INTEGER DEFAULT 3 CHECK (priority_level >= 1 AND priority_level <= 5),
    
    -- インサイト内容
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- 関連データ
    related_task_ids UUID[],
    related_date_range DATERANGE,
    supporting_data JSONB,
    
    -- アクション
    action_taken BOOLEAN DEFAULT false,
    action_type VARCHAR(50),
    action_date TIMESTAMPTZ,
    action_result TEXT,
    
    -- 状態管理
    is_active BOOLEAN DEFAULT true,
    is_dismissed BOOLEAN DEFAULT false,
    dismissal_reason TEXT,
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ================================================
-- インデックス作成
-- ================================================

-- time_estimates テーブル
CREATE INDEX IF NOT EXISTS idx_time_estimates_user_id ON time_estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_time_estimates_task_id ON time_estimates(task_id);
CREATE INDEX IF NOT EXISTS idx_time_estimates_category_id ON time_estimates(category_id);
CREATE INDEX IF NOT EXISTS idx_time_estimates_active ON time_estimates(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_time_estimates_created_at ON time_estimates(created_at);

-- time_records テーブル
CREATE INDEX IF NOT EXISTS idx_time_records_user_id ON time_records(user_id);
CREATE INDEX IF NOT EXISTS idx_time_records_task_id ON time_records(task_id);
CREATE INDEX IF NOT EXISTS idx_time_records_start_time ON time_records(start_time);
CREATE INDEX IF NOT EXISTS idx_time_records_status ON time_records(status);
CREATE INDEX IF NOT EXISTS idx_time_records_user_status ON time_records(user_id, status);
-- GiSTインデックス（btreeエクステンションが必要）
-- CREATE INDEX IF NOT EXISTS idx_time_records_date_range ON time_records USING GIST (tstzrange(start_time, COALESCE(end_time, 'infinity'::timestamptz)));

-- work_sessions テーブル
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_date ON work_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_work_sessions_task_date ON work_sessions(task_id, session_date);
CREATE INDEX IF NOT EXISTS idx_work_sessions_date ON work_sessions(session_date);

-- productivity_insights テーブル
CREATE INDEX IF NOT EXISTS idx_productivity_insights_user ON productivity_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_productivity_insights_type ON productivity_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_productivity_insights_active ON productivity_insights(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_productivity_insights_priority ON productivity_insights(user_id, priority_level);

-- ================================================
-- RLS (Row Level Security) ポリシー
-- ================================================

-- time_estimates テーブルのRLS
ALTER TABLE time_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time estimates" ON time_estimates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time estimates" ON time_estimates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time estimates" ON time_estimates
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own time estimates" ON time_estimates
    FOR DELETE USING (auth.uid() = user_id);

-- time_records テーブルのRLS
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time records" ON time_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time records" ON time_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time records" ON time_records
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own time records" ON time_records
    FOR DELETE USING (auth.uid() = user_id);

-- time_estimate_history テーブルのRLS
ALTER TABLE time_estimate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own estimate history" ON time_estimate_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own estimate history" ON time_estimate_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- work_sessions テーブルのRLS
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own work sessions" ON work_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own work sessions" ON work_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work sessions" ON work_sessions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own work sessions" ON work_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- productivity_insights テーブルのRLS
ALTER TABLE productivity_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON productivity_insights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights" ON productivity_insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights" ON productivity_insights
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights" ON productivity_insights
    FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- トリガー関数
-- ================================================

-- updated_at 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
CREATE TRIGGER update_time_estimates_updated_at BEFORE UPDATE ON time_estimates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_records_updated_at BEFORE UPDATE ON time_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_sessions_updated_at BEFORE UPDATE ON work_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productivity_insights_updated_at BEFORE UPDATE ON productivity_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 統計・分析用ビュー
-- ================================================

-- ユーザー時間統計ビュー
CREATE OR REPLACE VIEW user_time_statistics AS
SELECT 
    tr.user_id,
    DATE_TRUNC('day', tr.start_time) as work_date,
    COUNT(*) as session_count,
    SUM(tr.duration_minutes) FILTER (WHERE NOT tr.is_break) as total_work_minutes,
    SUM(tr.duration_minutes) FILTER (WHERE tr.is_break) as total_break_minutes,
    AVG(tr.productivity_rating) as avg_productivity,
    AVG(tr.difficulty_rating) as avg_difficulty,
    SUM(tr.interruption_count) as total_interruptions
FROM time_records tr
WHERE tr.status = 'completed' AND tr.duration_minutes IS NOT NULL
GROUP BY tr.user_id, DATE_TRUNC('day', tr.start_time);

-- 見積もり精度分析ビュー
CREATE OR REPLACE VIEW estimation_accuracy_analysis AS
SELECT 
    te.user_id,
    te.category_id,
    te.estimation_method,
    COUNT(*) as estimate_count,
    AVG(teh.accuracy_percentage) as avg_accuracy,
    AVG(ABS(teh.variance_minutes)) as avg_variance_abs,
    AVG(teh.variance_minutes) as avg_variance,
    STDDEV(teh.accuracy_percentage) as accuracy_stddev
FROM time_estimates te
JOIN time_estimate_history teh ON te.id = teh.time_estimate_id
WHERE teh.accuracy_percentage IS NOT NULL
GROUP BY te.user_id, te.category_id, te.estimation_method;

-- ================================================
-- サンプルデータ挿入用関数（開発・テスト用）
-- ================================================

CREATE OR REPLACE FUNCTION insert_sample_time_data(p_user_id UUID, p_task_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
    sample_estimate_id UUID;
    sample_record_id UUID;
BEGIN
    -- サンプル見積もりデータ
    INSERT INTO time_estimates (
        user_id, task_id, estimated_minutes, confidence_level, 
        estimation_method, notes
    ) VALUES (
        p_user_id, p_task_id, 120, 75, 'manual',
        'Sample estimate for testing purposes'
    ) RETURNING id INTO sample_estimate_id;
    
    -- サンプル時間記録データ
    INSERT INTO time_records (
        user_id, task_id, time_estimate_id, start_time, end_time,
        status, productivity_rating, difficulty_rating,
        work_description
    ) VALUES (
        p_user_id, p_task_id, sample_estimate_id,
        NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes',
        'completed', 4, 3, 'Sample work session'
    ) RETURNING id INTO sample_record_id;
    
    -- サンプル履歴データ
    INSERT INTO time_estimate_history (
        time_estimate_id, user_id, change_type,
        old_estimated_minutes, new_estimated_minutes,
        actual_minutes, accuracy_percentage, variance_minutes
    ) VALUES (
        sample_estimate_id, p_user_id, 'confirmed',
        120, 120, 90, 75.0, -30
    );
    
    RAISE NOTICE 'Sample time management data inserted successfully';
END;
$$ LANGUAGE plpgsql;