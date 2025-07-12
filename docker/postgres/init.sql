-- TaskShoot Calendar - PostgreSQL初期化スクリプト
-- 開発環境用データベース設定

-- データベース作成
CREATE DATABASE taskshoot_dev;
CREATE DATABASE taskshoot_test;

-- 拡張機能有効化
\c taskshoot_dev;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c taskshoot_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 開発用ユーザー作成
CREATE USER taskshoot_user WITH PASSWORD 'taskshoot_dev_password';
GRANT ALL PRIVILEGES ON DATABASE taskshoot_dev TO taskshoot_user;
GRANT ALL PRIVILEGES ON DATABASE taskshoot_test TO taskshoot_user;

-- 接続確認
\c taskshoot_dev;
SELECT 'TaskShoot Calendar Database Initialized Successfully!' as status;