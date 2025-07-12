# TaskShoot Calendar - Claude Code プロジェクト設定

### ロギング

- ライブラリ: vibelogger
- 使い方: https://github.com/fladdict/vibe-logger
- vibeloggerはコーディングエージェント用に高度な構造化データを出力するロガーです。
- ログにはvibeloggerを可能な限り利用し、ログからAIが自律的に何が起きてるかを把握できるようにする
- vibeloggerにはステップ、プロセス、コンテキスト情報、TODOなど様々な情報を構造化して記録できます。
- デバッグ時には./logsの出力を参照する

## 📋 プロジェクト概要

TaskShoot Calendar は、Googleカレンダーと連携したタスク管理アプリケーションです。セキュリティ重視のAI駆動開発により、時間見積もりと実績管理を行う生産性向上ツールを構築します。

**現在Phase**: Phase 1 - 基本セットアップ + 認証システム

## 📚 必須参照ドキュメント（毎回読み込み）

### 🔥 最重要ファイル

1. **`要件定義書.md`** - プロジェクト全体要件・5フェーズ詳細・機能要件
2. **`tmp/taskshoot-calendar-phase1-detailed-sow.md`** - Phase 1詳細実装方針・16ステップ手順
3. **`tmp/taskshoot-calendar-todos-schedule.md`** - 164項目TODO・20-24週間スケジュール
4. **`.env.example`** - 環境変数テンプレート・セキュリティ設定

## 🛠️ 技術スタック

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript（strict mode）
- **UI**: Tailwind CSS + shadcn/ui
- **State**: React標準（useState、Context）

### Backend & Database

- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth 2.0)
- **Security**: Row Level Security (RLS)

### Development & Deployment

- **Linting**: ESLint + Prettier
- **Testing**: Jest + Testing Library
- **Deployment**: Vercel
- **Environment**: Node.js 18+

## 🔐 セキュリティ原則（必須遵守）

### 認証・認可

- すべてのAPI エンドポイントに認証実装
- Row Level Security (RLS) による厳密なデータアクセス制御
- Google OAuth 2.0 による安全なソーシャル認証

### データ保護

- 入力値の検証とサニタイゼーション（Zod使用）
- XSS、CSRF、SQLインジェクション対策
- 環境変数による機密情報管理
- 適切なエラーハンドリング（内部情報の漏洩防止）

## 📁 プロジェクト構造

```
taskshoot-calendar/
├── app/                     # Next.js App Router
│   ├── (auth)/              # 認証関連ページグループ
│   ├── (dashboard)/         # メインアプリケーション
│   ├── api/                 # API Routes
│   ├── globals.css          # グローバルスタイル
│   └── layout.tsx           # ルートレイアウト
├── components/              # Reactコンポーネント
│   ├── ui/                  # shadcn/ui基本コンポーネント
│   ├── auth/                # 認証関連コンポーネント
│   ├── layout/              # レイアウトコンポーネント
│   └── shared/              # 共有コンポーネント
├── lib/                     # ユーティリティとヘルパー
│   ├── supabase/            # Supabaseクライアント
│   ├── auth/                # 認証ヘルパー
│   ├── utils.ts             # 汎用ユーティリティ
│   └── validations.ts       # バリデーション関数
├── types/                   # TypeScript型定義
│   ├── database.ts          # データベース型
│   ├── auth.ts              # 認証関連型
│   └── global.ts            # グローバル型
├── hooks/                   # カスタムReactフック
├── styles/                  # 追加スタイル
├── tmp/                     # 一時ファイル・ドキュメント
│   ├── taskshoot-calendar-phase1-detailed-sow.md
│   └── taskshoot-calendar-todos-schedule.md
├── .claude/                 # Claude Code設定
│   └── settings.local.json
├── 要件定義書.md             # プロジェクト要件定義
├── .env.example             # 環境変数テンプレート
├── .env.local               # 環境変数（機密情報）
└── CLAUDE.md               # このファイル（Claude Code設定）
```

## 🎯 Phase 1 重要実装項目

### ✅ 完了必須項目

- [ ] Next.js 14 + TypeScript プロジェクト初期化
- [ ] Tailwind CSS + shadcn/ui セットアップ
- [ ] Supabase プロジェクト作成・設定
- [ ] Google OAuth 2.0 認証実装
- [ ] 基本レイアウト（ヘッダー、ナビゲーション）
- [ ] 認証状態管理（Context/Provider）
- [ ] Vercel デプロイ設定

### 📊 品質基準（必達）

- TypeScriptエラー: **0件**
- ESLintエラー: **0件**
- Lighthouseスコア: **90点以上**
- セキュリティ脆弱性: **0件**

## 🔍 開発時の注意事項

### TypeScript

- 厳密モード（strict: true）で開発
- 型定義ファイル（types/）を適切に管理
- any型の使用を避ける

### セキュリティ

- 環境変数の適切な管理（.env.local）
- RLSポリシーの実装確認
- 入力値検証の実装

### UI/UX

- 日本語UI（Noto Sans JP フォント）
- レスポンシブデザイン必須
- アクセシビリティ対応（WAI-ARIA）

### コード品質

- コンポーネント分割と再利用性
- 適切なエラーハンドリング
- パフォーマンス最適化

## 🚀 Claude Code 開発ワークフロー

### 📖 必須ファイル読み込み手順

1. **`要件定義書.md`** - プロジェクト全体把握
2. **`tmp/taskshoot-calendar-phase1-detailed-sow.md`** - 実装方針確認
3. **`tmp/taskshoot-calendar-todos-schedule.md`** - TODO・スケジュール確認
4. **`.env.example`** - 環境設定確認

### 🔄 標準開発フロー

#### Phase 1 開発手順

```bash
# 1. プロジェクト初期化
npx create-next-app@latest . --typescript --tailwind --eslint --app

# 2. 依存関係追加
npm install @supabase/ssr @supabase/supabase-js lucide-react zod

# 3. shadcn/ui セットアップ
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label toast

# 4. 開発サーバー起動
npm run dev
```

#### 日次開発ループ

1. **TODO確認** - `tmp/taskshoot-calendar-todos-schedule.md`から作業項目選択
2. **SOW参照** - `tmp/taskshoot-calendar-phase1-detailed-sow.md`で実装方針確認
3. **実装** - セキュリティ原則遵守で実装
4. **品質チェック** - TypeScript・ESLint・テスト実行
5. **進捗更新** - 完了項目をチェック

### 🛠️ カスタムスラッシュコマンド

#### `.claude/commands/phase1-setup.md`:

```markdown
Phase 1セットアップタスクの実行

手順:

1. 要件定義書.mdとSOWを確認
2. Next.js 14プロジェクト初期化
3. TypeScript・ESLint設定
4. Supabase設定
5. 認証システム実装
```

#### `.claude/commands/security-check.md`:

```markdown
セキュリティチェックの実行

確認項目:

1. 環境変数の適切な管理
2. 入力値検証の実装
3. RLSポリシーの設定
4. 認証・認可の実装
5. XSS・CSRF対策
```

## ⚙️ Claude Code 設定推奨

### `.claude/settings.local.json` 設定:

```json
{
  "allowedTools": [
    "Edit",
    "Write",
    "Read",
    "Bash(npm *)",
    "Bash(npx *)",
    "Bash(git *)",
    "Glob",
    "Grep"
  ],
  "rules": [
    "セキュリティ重視の実装を最優先",
    "TypeScript厳密モードで開発",
    "shadcn/ui コンポーネントを活用",
    "レスポンシブデザイン必須"
  ]
}
```

## 📝 開発ログ管理

### 作業記録

- 各作業開始時にTODO確認
- 実装完了時に品質チェック実行
- 問題発生時は詳細記録

### 進捗報告

- 週次で進捗状況確認
- マイルストーン達成時に総合評価
- Phase完了時に次Phase準備

## 🚀 AI駆動開発方針

### 段階的実装

- 必要最小限のMVPから開始
- セキュリティを最優先に実装
- TypeScript型安全性の確保

### 効率化戦略

- shadcn/ui既存コンポーネントの活用
- Next.js 14ベストプラクティスの適用
- 自動化可能な作業の識別

## 🔧 環境変数管理

### 必須設定項目

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# TaskMaster AI (Optional)
TASKMASTER_API_KEY=
```

### セキュリティ注意事項

- `.env.local` は .gitignore で除外
- 本番環境では強力なシークレット使用
- API キーは定期的にローテーション

## 📈 プロジェクト進捗管理

### マイルストーン

- **Week 1終了時**: 基本セットアップ完了
- **Week 2終了時**: 認証システム完了
- **Phase 1完了時**: Vercelデプロイ成功

### 品質チェックポイント

```bash
# TypeScript型チェック
npm run type-check

# ESLint チェック
npm run lint

# ビルド確認
npm run build

# テスト実行
npm run test
```

## 🎯 成功指標

### 技術指標

- ページ読み込み時間 < 2秒
- First Contentful Paint < 1.5秒
- Cumulative Layout Shift < 0.1
- セキュリティスコア A評価

### 機能指標

- Google OAuth認証: 正常動作
- レスポンシブデザイン: 全デバイス対応
- セキュリティ脆弱性: 0件
- ユーザビリティ: 直感的操作

## 🔄 Git ワークフロー

### コミット規約

```bash
# 機能追加
git commit -m "feat: Google OAuth認証実装"

# バグ修正
git commit -m "fix: 認証状態管理の不具合修正"

# リファクタリング
git commit -m "refactor: コンポーネント構造の最適化"

# ドキュメント
git commit -m "docs: README更新"
```

### ブランチ戦略

- `main`: 本番環境用
- `develop`: 開発環境用
- `feature/auth`: 認証機能開発
- `feature/ui`: UI実装

## 🚨 トラブルシューティング

### よくある問題

1. **TypeScriptエラー**: 型定義の確認
2. **Supabase接続エラー**: 環境変数の確認
3. **shadcn/ui問題**: 設定ファイルの確認
4. **認証エラー**: Google OAuth設定の確認

### 緊急時対応

- エラーログの詳細確認
- 環境変数の再設定
- 依存関係の再インストール
- キャッシュクリア

---

**最終更新**: 2025年1月12日  
**プロジェクト開始**: 2025年1月  
**現在フェーズ**: Phase 1 - 基本セットアップ + 認証システム  
**次回レビュー**: Phase 1中間地点

## 🎯 **【重要】指示受領時の必須作業フロー**

### ⚠️ **絶対に間違えてはいけない作業手順**

**指示を受けた際は、以下の手順を必ず実行すること：**

#### 📋 **Step 1: README.md分析（最優先）**

- **必須**: `/Users/kota5656/projects/taskshoot-calendar/README.md` を最初に分析
- 技術スタック確認（Next.js 14 + TypeScript + Supabase + shadcn/ui）
- セキュリティ要件確認（Google OAuth 2.0 + RLS + 入力値検証）

#### 📊 **Step 2: ドキュメント確認**

- `/Users/kota5656/projects/taskshoot-calendar/tmp/taskshoot-calendar-todos-schedule.md` - TODO確認
- `/Users/kota5656/projects/taskshoot-calendar/tmp/taskshoot-calendar-phase1-detailed-sow.md` - 実装方針確認
- `/Users/kota5656/projects/taskshoot-calendar/要件定義書.md` - 全体要件確認

#### 🔄 **Step 3: TODO実行ループ**

1. **TODOを一つ選択** - 164項目から優先度順
2. **実装開始** - セキュリティ重視で実装
3. **品質チェック** - TypeScript・ESLint・テスト実行
4. **完了チェック** - TODOリストにチェックマーク
5. **通知音実行** - `echo -e "\a"` でビープ音

#### 📝 **Step 4: 完了記録**

```bash
# 完了時に必ず実行
echo "✅ TODO完了: [実装した内容]"
echo -e "\a"  # 通知音
```

### 🚨 **絶対遵守事項**

- **README.md を最初に必ず読む**
- **TODOを一つずつ順番に実行**
- **完了時は必ずチェック＋通知音**
- **セキュリティ要件を最優先**
- **TypeScript厳密モードで開発**

---

**重要**: このCLAUDE.mdは TaskShoot Calendar プロジェクト専用設定です。Claude Code セッション開始時に自動読み込まれ、プロジェクトの全体把握と効率的な開発をサポートします。
