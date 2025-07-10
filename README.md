# TaskShoot Calendar

**セキュリティ重視のAI駆動開発によるタスク管理アプリケーション**

## 🎯 プロジェクト概要

Googleカレンダーと連携したタスク管理アプリケーション。タスクシュート機能により、時間見積もりと実績管理を行う生産性向上ツール。

## 🔒 セキュリティ重視の開発方針

- **認証**: Google OAuth 2.0 + Supabase Auth
- **データベース**: Row Level Security (RLS) 実装
- **API**: 入力値検証・サニタイゼーション
- **環境変数**: 機密情報の適切な管理

## 🛠️ 技術スタック

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google OAuth)
- **Deployment**: Vercel

## 🚀 開発環境セットアップ

### 1. 環境変数の設定

```bash
cp .env.example .env.local
# .env.local を編集してください
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

## 📁 プロジェクト構造

```
taskshoot-calendar/
├── app/                 # Next.js App Router
├── components/          # React components
├── lib/                # Utility functions
├── docs/               # Documentation
├── .env.example        # Environment variables template
└── README.md          # This file
```

## 🔐 セキュリティ要件

- すべてのAPI エンドポイントに認証を実装
- 入力値の検証とサニタイゼーション
- XSS、CSRF、SQLインジェクション対策
- 適切なエラーハンドリング（内部情報の漏洩防止）

## 📝 開発ログ

- プロジェクト作成: 2025年1月
- 開発方針: AI駆動開発 + セキュリティ重視

---

**Created by**: AI駆動開発プロジェクト  
**Security Focus**: Application ⇔ Supabase connection security