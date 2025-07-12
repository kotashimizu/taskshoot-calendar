# TaskShoot Calendar - Phase 1 詳細実装SOW

## 📋 プロジェクト基本情報

### プロジェクト概要

- **プロジェクト名**: TaskShoot Calendar
- **Phase**: Phase 1 - 基本セットアップ + 認証システム
- **目的**: Googleカレンダーと連携したタスク管理アプリケーションの基盤構築
- **開発方針**: セキュリティ重視のAI駆動開発
- **対象ユーザー**: 個人利用（最大100人程度）、時間管理と生産性向上を重視

### 技術要件

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) + Row Level Security (RLS)
- **Authentication**: Supabase Auth (Google OAuth 2.0)
- **Deployment**: Vercel
- **Language**: 日本語UI

---

## 🎯 Phase 1 作業範囲と目的

### 1.1 実装する機能の詳細

#### 🔧 基本セットアップ

- **Next.js 14 App Router** による最新のReactアプリケーション基盤
- **TypeScript** による型安全な開発環境
- **ESLint + Prettier** による統一されたコード品質管理
- **Git設定** とコミット規約の確立

#### 🎨 UI/UXフレームワーク

- **Tailwind CSS** による効率的なスタイリング
- **shadcn/ui** による一貫性のあるUIコンポーネント
- **レスポンシブデザイン** による全デバイス対応
- **日本語フォント** とローカライゼーション対応

#### 🔐 認証システム

- **Google OAuth 2.0** による安全なソーシャル認証
- **Supabase Auth** による認証状態管理
- **Row Level Security (RLS)** によるデータアクセス制御
- **セッション管理** と自動ログアウト機能

#### 🏗️ アプリケーション構造

- **App Router** による現代的なルーティング
- **レイアウトシステム** による効率的なUI管理
- **ミドルウェア** による認証保護
- **エラーハンドリング** システム

### 1.2 期待される成果物

#### 📁 成果物一覧

1. **完全に設定されたNext.js 14プロジェクト**
2. **動作する認証システム（Google OAuth）**
3. **基本的なアプリケーションレイアウト**
4. **Vercelでのデプロイ済み環境**
5. **セキュリティが適切に設定されたSupabaseプロジェクト**
6. **包括的なドキュメント**

### 1.3 成功指標

#### ✅ 技術的指標

- TypeScriptエラー数: **0件**
- ESLintエラー数: **0件**
- Lighthouseスコア: **90点以上**
- ビルド成功率: **100%**
- テストカバレッジ: **80%以上**

#### ✅ 機能的指標

- Google OAuth認証: **正常動作**
- レスポンシブデザイン: **全デバイス対応**
- ページ読み込み時間: **2秒以内**
- セキュリティ脆弱性: **0件**

---

## 🏗️ 技術的実装方針

### 2.1 アーキテクチャ設計

#### 📐 システム全体構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js 14)  │───▶│   (API Routes)  │───▶│   (Supabase)    │
│   + TypeScript  │    │   + Middleware  │    │   + RLS         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI/UX         │    │   Authentication│    │   Security      │
│   (shadcn/ui)   │    │   (Google OAuth) │    │   (Row Level)   │
│   + Tailwind    │    │   + Supabase    │    │   + Encryption  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### 🗂️ フォルダ構造設計

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
└── public/                  # 静的ファイル
```

### 2.2 データベース設計（Supabase + RLS）

#### 🗄️ 基本テーブル構造

```sql
-- ユーザーテーブル（Supabase Authと連携）
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) ポリシー
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 自分のプロファイルのみアクセス可能
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

#### 🔒 RLS (Row Level Security) 設計方針

1. **個人データ分離**: 各ユーザーは自分のデータのみアクセス可能
2. **認証状態確認**: 未認証ユーザーはデータアクセス不可
3. **最小権限原則**: 必要最小限の権限のみ付与
4. **監査ログ**: データアクセスの記録と監視

### 2.3 API設計

#### 🔌 RESTful API エンドポイント設計

```typescript
// API Routes 構造
app/api/
├── auth/
│   ├── callback/route.ts     # OAuth コールバック
│   ├── logout/route.ts       # ログアウト
│   └── session/route.ts      # セッション確認
├── user/
│   ├── profile/route.ts      # ユーザープロファイル
│   └── preferences/route.ts  # ユーザー設定
└── health/route.ts           # ヘルスチェック
```

#### 🛡️ API セキュリティ実装

```typescript
// 認証ミドルウェアの例
export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient({ req: request, res: response });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 保護されたルートの認証チェック
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}
```

### 2.4 コンポーネント設計

#### 🧩 コンポーネント階層

```
App
├── RootLayout
│   ├── AuthProvider          # 認証コンテキスト
│   ├── ThemeProvider         # テーマ管理
│   └── ToastProvider         # 通知システム
├── AuthLayout               # 認証関連レイアウト
│   ├── LoginForm
│   ├── SignupForm
│   └── OAuthButtons
└── DashboardLayout          # メインアプリレイアウト
    ├── Header
    │   ├── UserMenu
    │   └── NavigationMenu
    ├── Sidebar
    └── MainContent
```

---

## 🔐 セキュリティ考慮事項

### 3.1 認証・認可の実装方法

#### 🔑 Google OAuth 2.0 実装

```typescript
// Supabase Auth設定例
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Google OAuth設定
const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
};
```

#### 🛡️ セッション管理

```typescript
// セッション状態管理Hook
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初期セッション確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // セッション変更監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}
```

### 3.2 データ保護対策

#### 🔒 環境変数管理

```bash
# .env.local（機密情報）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

#### 🛡️ CSP (Content Security Policy) 設定

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data: https:;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self' https://*.supabase.co;
    `
      .replace(/\s{2,}/g, ' ')
      .trim(),
  },
];
```

### 3.3 入力値検証方法

#### ✅ Zod による型安全なバリデーション

```typescript
import { z } from 'zod';

// ユーザープロファイル用スキーマ
export const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内で入力してください')
    .regex(
      /^[a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]+$/,
      '有効な文字のみ使用してください'
    ),
  email: z.string().email('有効なメールアドレスを入力してください'),
  avatar_url: z.string().url('有効なURLを入力してください').optional(),
});

// API Routeでの使用例
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = profileSchema.parse(body);

    // バリデーション済みデータで処理続行
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      );
    }
  }
}
```

### 3.4 エラーハンドリング方針

#### 🚨 統一エラーハンドリング

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// エラーレスポンス統一化
export function createErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // 内部エラーは詳細を隠す
  console.error('Internal error:', error);
  return NextResponse.json(
    { error: 'システムエラーが発生しました' },
    { status: 500 }
  );
}
```

---

## 🎨 UI/UX設計

### 4.1 レスポンシブデザイン対応

#### 📱 ブレークポイント設計

```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      xs: '475px', // 小さなスマートフォン
      sm: '640px', // スマートフォン
      md: '768px', // タブレット
      lg: '1024px', // デスクトップ
      xl: '1280px', // 大きなデスクトップ
      '2xl': '1536px', // 超大画面
    },
  },
};
```

#### 📐 レイアウトパターン

```typescript
// レスポンシブレイアウトコンポーネント
export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* モバイル: 単一カラム、デスクトップ: サイドバー付き */}
      <div className="flex flex-col lg:flex-row">
        {/* サイドバー - デスクトップのみ表示 */}
        <aside className="hidden lg:block lg:w-64 lg:fixed lg:h-full">
          <Sidebar />
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 lg:ml-64">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

### 4.2 アクセシビリティ対応

#### ♿ WAI-ARIA実装

```typescript
// アクセシブルなナビゲーションコンポーネント
export function AccessibleNavigation() {
  return (
    <nav aria-label="メインナビゲーション" role="navigation">
      <ul className="space-y-2">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-current="page"
          >
            <HomeIcon className="w-5 h-5 mr-3" aria-hidden="true" />
            ダッシュボード
          </Link>
        </li>
      </ul>
    </nav>
  );
}
```

### 4.3 日本語UI設計

#### 🈵 日本語フォント設定

```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap');

:root {
  --font-sans:
    'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic',
    'Meiryo', sans-serif;
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

#### 🔤 多言語化対応基盤

```typescript
// lib/i18n.ts
export const messages = {
  ja: {
    auth: {
      signIn: 'ログイン',
      signOut: 'ログアウト',
      signInWithGoogle: 'Googleでログイン',
      welcome: 'ようこそ',
    },
    dashboard: {
      title: 'ダッシュボード',
      tasks: 'タスク',
      calendar: 'カレンダー',
    },
    errors: {
      unauthorized: '認証が必要です',
      forbidden: 'アクセス権限がありません',
      notFound: 'ページが見つかりません',
    },
  },
} as const;
```

### 4.4 shadcn/ui活用方針

#### 🎨 テーマカスタマイズ

```typescript
// components.json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

#### 🧩 カスタムコンポーネント例

```typescript
// components/ui/loading-button.tsx
interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  children: React.ReactNode;
}

export function LoadingButton({ loading, children, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={loading} {...props}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
```

---

## 🧪 テスト・品質保証

### 5.1 TypeScript型安全性確保

#### 📘 strict設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true
  }
}
```

#### 🔍 型定義例

```typescript
// types/database.ts
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
      };
    };
  };
}
```

### 5.2 ESLint・Prettier設定

#### 🔧 ESLint設定

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

#### 💅 Prettier設定

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### 5.3 テスト方針

#### 🧪 テスト戦略

```typescript
// __tests__/auth.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from '@/components/auth/login-form';

describe('LoginForm', () => {
  it('should render login button', () => {
    render(<LoginForm />);
    expect(screen.getByText('Googleでログイン')).toBeInTheDocument();
  });

  it('should handle OAuth sign in', async () => {
    const mockSignIn = jest.fn();
    render(<LoginForm onSignIn={mockSignIn} />);

    fireEvent.click(screen.getByText('Googleでログイン'));
    expect(mockSignIn).toHaveBeenCalled();
  });
});
```

---

## 📁 実装手順（diff付き）

### 6.1 プロジェクト初期セットアップ

#### Step 1: Next.js プロジェクト作成

```diff
# 新規プロジェクト作成
+ npx create-next-app@latest taskshoot-calendar --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
+ cd taskshoot-calendar
```

#### Step 2: 依存関係追加

```diff
# package.json
{
  "dependencies": {
+   "@supabase/ssr": "^0.0.10",
+   "@supabase/supabase-js": "^2.38.4",
+   "lucide-react": "^0.294.0",
+   "class-variance-authority": "^0.7.0",
+   "clsx": "^2.0.0",
+   "tailwind-merge": "^2.0.0",
+   "zod": "^3.22.4"
  },
  "devDependencies": {
+   "@types/node": "^20.8.10",
+   "prettier": "^3.0.3",
+   "prettier-plugin-tailwindcss": "^0.5.7"
  }
}
```

### 6.2 設定ファイル作成

#### Step 3: TypeScript設定

```diff
# tsconfig.json
{
  "compilerOptions": {
+   "strict": true,
+   "noUncheckedIndexedAccess": true,
+   "exactOptionalPropertyTypes": true,
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### Step 4: Tailwind設定

```diff
# tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
+ darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
+ prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
+     colors: {
+       border: "hsl(var(--border))",
+       input: "hsl(var(--input))",
+       ring: "hsl(var(--ring))",
+       background: "hsl(var(--background))",
+       foreground: "hsl(var(--foreground))",
+       primary: {
+         DEFAULT: "hsl(var(--primary))",
+         foreground: "hsl(var(--primary-foreground))",
+       },
+       secondary: {
+         DEFAULT: "hsl(var(--secondary))",
+         foreground: "hsl(var(--secondary-foreground))",
+       },
+       destructive: {
+         DEFAULT: "hsl(var(--destructive))",
+         foreground: "hsl(var(--destructive-foreground))",
+       },
+       muted: {
+         DEFAULT: "hsl(var(--muted))",
+         foreground: "hsl(var(--muted-foreground))",
+       },
+       accent: {
+         DEFAULT: "hsl(var(--accent))",
+         foreground: "hsl(var(--accent-foreground))",
+       },
+       popover: {
+         DEFAULT: "hsl(var(--popover))",
+         foreground: "hsl(var(--popover-foreground))",
+       },
+       card: {
+         DEFAULT: "hsl(var(--card))",
+         foreground: "hsl(var(--card-foreground))",
+       },
+     },
+     borderRadius: {
+       lg: "var(--radius)",
+       md: "calc(var(--radius) - 2px)",
+       sm: "calc(var(--radius) - 4px)",
+     },
+     keyframes: {
+       "accordion-down": {
+         from: { height: "0" },
+         to: { height: "var(--radix-accordion-content-height)" },
+       },
+       "accordion-up": {
+         from: { height: "var(--radix-accordion-content-height)" },
+         to: { height: "0" },
+       },
+     },
+     animation: {
+       "accordion-down": "accordion-down 0.2s ease-out",
+       "accordion-up": "accordion-up 0.2s ease-out",
+     },
    },
  },
+ plugins: [require("tailwindcss-animate")],
}
export default config
```

### 6.3 shadcn/ui セットアップ

#### Step 5: shadcn/ui 初期化

```diff
+ npx shadcn-ui@latest init
```

#### Step 6: 基本コンポーネント追加

```diff
+ npx shadcn-ui@latest add button
+ npx shadcn-ui@latest add card
+ npx shadcn-ui@latest add input
+ npx shadcn-ui@latest add label
+ npx shadcn-ui@latest add toast
+ npx shadcn-ui@latest add dropdown-menu
+ npx shadcn-ui@latest add avatar
```

### 6.4 Supabase設定

#### Step 7: Supabaseクライアント作成

```diff
+ mkdir lib/supabase
```

```diff
# lib/supabase/client.ts
+ import { createBrowserClient } from '@supabase/ssr'
+
+ export function createClient() {
+   return createBrowserClient(
+     process.env.NEXT_PUBLIC_SUPABASE_URL!,
+     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
+   )
+ }
```

```diff
# lib/supabase/server.ts
+ import { createServerClient, type CookieOptions } from '@supabase/ssr'
+ import { cookies } from 'next/headers'
+
+ export function createClient() {
+   const cookieStore = cookies()
+
+   return createServerClient(
+     process.env.NEXT_PUBLIC_SUPABASE_URL!,
+     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
+     {
+       cookies: {
+         get(name: string) {
+           return cookieStore.get(name)?.value
+         },
+         set(name: string, value: string, options: CookieOptions) {
+           try {
+             cookieStore.set({ name, value, ...options })
+           } catch (error) {
+             // Server Component内でcookieを設定する際のエラーハンドリング
+           }
+         },
+         remove(name: string, options: CookieOptions) {
+           try {
+             cookieStore.set({ name, value: '', ...options })
+           } catch (error) {
+             // Server Component内でcookieを削除する際のエラーハンドリング
+           }
+         },
+       },
+     }
+   )
+ }
```

#### Step 8: 型定義作成

```diff
+ mkdir types
```

```diff
# types/database.ts
+ export type Json =
+   | string
+   | number
+   | boolean
+   | null
+   | { [key: string]: Json | undefined }
+   | Json[]
+
+ export interface Database {
+   public: {
+     Tables: {
+       profiles: {
+         Row: {
+           id: string
+           email: string
+           full_name: string | null
+           avatar_url: string | null
+           created_at: string
+           updated_at: string
+         }
+         Insert: {
+           id: string
+           email: string
+           full_name?: string | null
+           avatar_url?: string | null
+         }
+         Update: {
+           full_name?: string | null
+           avatar_url?: string | null
+         }
+       }
+     }
+     Views: {
+       [_ in never]: never
+     }
+     Functions: {
+       [_ in never]: never
+     }
+     Enums: {
+       [_ in never]: never
+     }
+   }
+ }
```

### 6.5 認証システム実装

#### Step 9: 認証フック作成

```diff
+ mkdir hooks
```

```diff
# hooks/use-auth.ts
+ 'use client'
+
+ import { useEffect, useState } from 'react'
+ import { User, Session } from '@supabase/supabase-js'
+ import { createClient } from '@/lib/supabase/client'
+
+ export function useAuth() {
+   const [user, setUser] = useState<User | null>(null)
+   const [session, setSession] = useState<Session | null>(null)
+   const [loading, setLoading] = useState(true)
+   const supabase = createClient()
+
+   useEffect(() => {
+     const getSession = async () => {
+       const { data: { session } } = await supabase.auth.getSession()
+       setSession(session)
+       setUser(session?.user ?? null)
+       setLoading(false)
+     }
+
+     getSession()
+
+     const { data: { subscription } } = supabase.auth.onAuthStateChange(
+       async (event, session) => {
+         setSession(session)
+         setUser(session?.user ?? null)
+         setLoading(false)
+       }
+     )
+
+     return () => subscription.unsubscribe()
+   }, [supabase])
+
+   const signInWithGoogle = async () => {
+     const { error } = await supabase.auth.signInWithOAuth({
+       provider: 'google',
+       options: {
+         redirectTo: `${window.location.origin}/auth/callback`,
+       },
+     })
+     if (error) throw error
+   }
+
+   const signOut = async () => {
+     const { error } = await supabase.auth.signOut()
+     if (error) throw error
+   }
+
+   return {
+     user,
+     session,
+     loading,
+     signInWithGoogle,
+     signOut,
+   }
+ }
```

#### Step 10: 認証コンポーネント作成

```diff
+ mkdir components/auth
```

```diff
# components/auth/auth-provider.tsx
+ 'use client'
+
+ import { createContext, useContext, ReactNode } from 'react'
+ import { useAuth } from '@/hooks/use-auth'
+ import { User, Session } from '@supabase/supabase-js'
+
+ interface AuthContextType {
+   user: User | null
+   session: Session | null
+   loading: boolean
+   signInWithGoogle: () => Promise<void>
+   signOut: () => Promise<void>
+ }
+
+ const AuthContext = createContext<AuthContextType | undefined>(undefined)
+
+ export function AuthProvider({ children }: { children: ReactNode }) {
+   const auth = useAuth()
+
+   return (
+     <AuthContext.Provider value={auth}>
+       {children}
+     </AuthContext.Provider>
+   )
+ }
+
+ export function useAuthContext() {
+   const context = useContext(AuthContext)
+   if (context === undefined) {
+     throw new Error('useAuthContext must be used within an AuthProvider')
+   }
+   return context
+ }
```

```diff
# components/auth/login-form.tsx
+ 'use client'
+
+ import { useState } from 'react'
+ import { Button } from '@/components/ui/button'
+ import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
+ import { useAuthContext } from './auth-provider'
+ import { Loader2 } from 'lucide-react'
+
+ export function LoginForm() {
+   const [loading, setLoading] = useState(false)
+   const { signInWithGoogle } = useAuthContext()
+
+   const handleSignIn = async () => {
+     try {
+       setLoading(true)
+       await signInWithGoogle()
+     } catch (error) {
+       console.error('ログインエラー:', error)
+     } finally {
+       setLoading(false)
+     }
+   }
+
+   return (
+     <div className="flex min-h-screen items-center justify-center bg-gray-50">
+       <Card className="w-full max-w-md">
+         <CardHeader className="text-center">
+           <CardTitle className="text-2xl font-bold">TaskShoot Calendar</CardTitle>
+           <CardDescription>
+             Googleアカウントでログインしてください
+           </CardDescription>
+         </CardHeader>
+         <CardContent>
+           <Button
+             onClick={handleSignIn}
+             disabled={loading}
+             className="w-full"
+             size="lg"
+           >
+             {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
+             Googleでログイン
+           </Button>
+         </CardContent>
+       </Card>
+     </div>
+   )
+ }
```

### 6.6 レイアウト実装

#### Step 11: レイアウトコンポーネント作成

```diff
+ mkdir components/layout
```

```diff
# components/layout/header.tsx
+ 'use client'
+
+ import { Button } from '@/components/ui/button'
+ import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
+ import {
+   DropdownMenu,
+   DropdownMenuContent,
+   DropdownMenuItem,
+   DropdownMenuSeparator,
+   DropdownMenuTrigger,
+ } from '@/components/ui/dropdown-menu'
+ import { useAuthContext } from '@/components/auth/auth-provider'
+ import { LogOut, Settings, User } from 'lucide-react'
+
+ export function Header() {
+   const { user, signOut } = useAuthContext()
+
+   const handleSignOut = async () => {
+     try {
+       await signOut()
+     } catch (error) {
+       console.error('ログアウトエラー:', error)
+     }
+   }
+
+   return (
+     <header className="border-b bg-white">
+       <div className="container mx-auto flex h-16 items-center justify-between px-4">
+         <div className="flex items-center space-x-4">
+           <h1 className="text-xl font-bold">TaskShoot Calendar</h1>
+         </div>
+
+         <div className="flex items-center space-x-4">
+           <DropdownMenu>
+             <DropdownMenuTrigger asChild>
+               <Button variant="ghost" className="relative h-8 w-8 rounded-full">
+                 <Avatar className="h-8 w-8">
+                   <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
+                   <AvatarFallback>
+                     {user?.email?.charAt(0).toUpperCase()}
+                   </AvatarFallback>
+                 </Avatar>
+               </Button>
+             </DropdownMenuTrigger>
+             <DropdownMenuContent className="w-56" align="end" forceMount>
+               <div className="flex items-center justify-start gap-2 p-2">
+                 <div className="flex flex-col space-y-1 leading-none">
+                   <p className="font-medium">{user?.user_metadata?.full_name}</p>
+                   <p className="w-[200px] truncate text-sm text-muted-foreground">
+                     {user?.email}
+                   </p>
+                 </div>
+               </div>
+               <DropdownMenuSeparator />
+               <DropdownMenuItem>
+                 <User className="mr-2 h-4 w-4" />
+                 プロファイル
+               </DropdownMenuItem>
+               <DropdownMenuItem>
+                 <Settings className="mr-2 h-4 w-4" />
+                 設定
+               </DropdownMenuItem>
+               <DropdownMenuSeparator />
+               <DropdownMenuItem onClick={handleSignOut}>
+                 <LogOut className="mr-2 h-4 w-4" />
+                 ログアウト
+               </DropdownMenuItem>
+             </DropdownMenuContent>
+           </DropdownMenu>
+         </div>
+       </div>
+     </header>
+   )
+ }
```

#### Step 12: App Router ページ作成

```diff
# app/layout.tsx
import type { Metadata } from 'next'
+ import { Inter } from 'next/font/google'
import './globals.css'
+ import { AuthProvider } from '@/components/auth/auth-provider'
+ import { Toaster } from '@/components/ui/toaster'

+ const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TaskShoot Calendar',
  description: 'Googleカレンダーと連携したタスク管理アプリケーション',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
+     <body className={inter.className}>
+       <AuthProvider>
          {children}
+         <Toaster />
+       </AuthProvider>
      </body>
    </html>
  )
}
```

```diff
# app/page.tsx
+ 'use client'
+
+ import { useAuthContext } from '@/components/auth/auth-provider'
+ import { LoginForm } from '@/components/auth/login-form'
+ import { Header } from '@/components/layout/header'
+ import { Loader2 } from 'lucide-react'
+
+ export default function Home() {
+   const { user, loading } = useAuthContext()
+
+   if (loading) {
+     return (
+       <div className="flex min-h-screen items-center justify-center">
+         <Loader2 className="h-8 w-8 animate-spin" />
+       </div>
+     )
+   }
+
+   if (!user) {
+     return <LoginForm />
+   }
+
+   return (
+     <div className="min-h-screen bg-gray-50">
+       <Header />
+       <main className="container mx-auto py-8 px-4">
+         <div className="text-center">
+           <h2 className="text-3xl font-bold mb-4">ダッシュボード</h2>
+           <p className="text-gray-600">TaskShoot Calendarへようこそ！</p>
+         </div>
+       </main>
+     </div>
+   )
+ }
```

#### Step 13: 認証コールバック処理

```diff
+ mkdir app/auth/callback
```

```diff
# app/auth/callback/route.ts
+ import { createClient } from '@/lib/supabase/server'
+ import { NextRequest, NextResponse } from 'next/server'
+
+ export async function GET(request: NextRequest) {
+   const { searchParams, origin } = new URL(request.url)
+   const code = searchParams.get('code')
+   const next = searchParams.get('next') ?? '/'
+
+   if (code) {
+     const supabase = createClient()
+     const { error } = await supabase.auth.exchangeCodeForSession(code)
+     if (!error) {
+       return NextResponse.redirect(`${origin}${next}`)
+     }
+   }
+
+   // エラーが発生した場合はログインページにリダイレクト
+   return NextResponse.redirect(`${origin}/login`)
+ }
```

#### Step 14: ミドルウェア設定

```diff
# middleware.ts
+ import { createServerClient, type CookieOptions } from '@supabase/ssr'
+ import { NextResponse, type NextRequest } from 'next/server'
+
+ export async function middleware(request: NextRequest) {
+   let response = NextResponse.next({
+     request: {
+       headers: request.headers,
+     },
+   })
+
+   const supabase = createServerClient(
+     process.env.NEXT_PUBLIC_SUPABASE_URL!,
+     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
+     {
+       cookies: {
+         get(name: string) {
+           return request.cookies.get(name)?.value
+         },
+         set(name: string, value: string, options: CookieOptions) {
+           request.cookies.set({
+             name,
+             value,
+             ...options,
+           })
+           response = NextResponse.next({
+             request: {
+               headers: request.headers,
+             },
+           })
+           response.cookies.set({
+             name,
+             value,
+             ...options,
+           })
+         },
+         remove(name: string, options: CookieOptions) {
+           request.cookies.set({
+             name,
+             value: '',
+             ...options,
+           })
+           response = NextResponse.next({
+             request: {
+               headers: request.headers,
+             },
+           })
+           response.cookies.set({
+             name,
+             value: '',
+             ...options,
+           })
+         },
+       },
+     }
+   )
+
+   await supabase.auth.getUser()
+
+   return response
+ }
+
+ export const config = {
+   matcher: [
+     '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
+   ],
+ }
```

### 6.5 環境変数とデプロイ設定

#### Step 15: 環境変数設定

```diff
# .env.local（既に作成済み）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
```

#### Step 16: Vercel設定

```diff
# vercel.json
+ {
+   "buildCommand": "npm run build",
+   "outputDirectory": ".next",
+   "devCommand": "npm run dev",
+   "installCommand": "npm install",
+   "framework": "nextjs",
+   "functions": {
+     "app/api/**/*.ts": {
+       "maxDuration": 30
+     }
+   }
+ }
```

---

## ✅ 検証方法

### 7.1 動作確認手順

#### 🔍 ローカル環境での検証

```bash
# 1. 依存関係のインストール確認
npm install

# 2. TypeScript型チェック
npm run type-check

# 3. ESLintチェック
npm run lint

# 4. ビルド確認
npm run build

# 5. 開発サーバー起動
npm run dev
```

#### 🌐 ブラウザでの確認項目

1. **ログイン機能**
   - [ ] Googleログインボタンが表示される
   - [ ] Google認証画面が正常に表示される
   - [ ] 認証後、ダッシュボードにリダイレクトされる
   - [ ] ユーザー情報が正しく表示される

2. **セッション管理**
   - [ ] ページリロード後もログイン状態が保持される
   - [ ] ログアウト機能が正常に動作する
   - [ ] 未認証時にはログイン画面が表示される

3. **レスポンシブデザイン**
   - [ ] スマートフォンサイズで正常表示
   - [ ] タブレットサイズで正常表示
   - [ ] デスクトップサイズで正常表示

### 7.2 セキュリティテスト手順

#### 🛡️ セキュリティチェックリスト

1. **認証・認可**
   - [ ] 未認証ユーザーはダッシュボードにアクセスできない
   - [ ] セッション有効期限が適切に管理されている
   - [ ] ログアウト後、バック等でアクセスできない

2. **データ保護**
   - [ ] API キーが環境変数で管理されている
   - [ ] 機密情報がクライアントサイドに露出していない
   - [ ] RLSポリシーが適切に設定されている

3. **XSS対策**
   - [ ] ユーザー入力が適切にエスケープされている
   - [ ] innerHTML等の危険な操作を避けている
   - [ ] CSPヘッダーが適切に設定されている

### 7.3 パフォーマンス確認方法

#### ⚡ Lighthouse監査

```bash
# Lighthouse CLI実行
npm install -g lighthouse
lighthouse http://localhost:3000 --output=html --output-path=./lighthouse-report.html
```

#### 📊 期待値

- **Performance**: 90点以上
- **Accessibility**: 95点以上
- **Best Practices**: 95点以上
- **SEO**: 90点以上

### 7.4 ブラウザ互換性確認

#### 🌐 対応ブラウザ

- Chrome (最新版 + 1つ前のバージョン)
- Firefox (最新版 + 1つ前のバージョン)
- Safari (最新版 + 1つ前のバージョン)
- Edge (最新版 + 1つ前のバージョン)

---

## ⚠️ リスクと対策

### 8.1 技術的リスク

#### 🔧 Next.js 14 App Router の学習コスト

**リスク**: 新しいApp Routerの概念に慣れるまでの時間
**対策**:

- 公式ドキュメントの熟読
- 段階的な実装によるリスク分散
- 既存のPages Routerからの移行経験活用

#### 🔌 Supabase API の制限

**リスク**: APIレート制限やサービス制限
**対策**:

- 適切なキャッシング戦略
- エラーハンドリングの実装
- バックアップ認証方式の検討

### 8.2 セキュリティリスク

#### 🛡️ OAuth フロー の脆弱性

**リスク**: OAuth実装時のセキュリティホール
**対策**:

- Supabaseの公式実装パターンに従う
- PKCE（Proof Key for Code Exchange）の使用
- 定期的なセキュリティ監査

#### 🔐 環境変数の漏洩

**リスク**: APIキーや機密情報の露出
**対策**:

- .env.local の .gitignore 追加
- Vercel環境変数の適切な設定
- 定期的なキーローテーション

### 8.3 スケジュールリスク

#### ⏰ 実装時間の見積もり不足

**リスク**: Phase 1完了予定の遅延
**対策**:

- MVP (Minimum Viable Product) アプローチ
- 段階的なリリース戦略
- バッファタイムの確保

#### 🐛 デバッグ時間の増大

**リスク**: 予期しないバグによる開発遅延
**対策**:

- 早期のテスト実装
- TypeScriptによる型安全性確保
- コードレビューの実施

### 8.4 運用リスク

#### 🌐 Vercel デプロイ時の問題

**リスク**: デプロイエラーや設定ミス
**対策**:

- ローカル環境での十分なテスト
- 段階的デプロイ（staging → production）
- デプロイ前チェックリストの作成

#### 📊 Supabase サービス依存

**リスク**: Supabaseサービス障害時の影響
**対策**:

- エラーハンドリングの充実
- ユーザー向け障害情報の表示
- 代替認証方式の検討

---

## 📋 プロジェクト管理

### 9.1 進捗管理

#### 📅 週次チェックポイント

**毎週金曜日 17:00**

- [ ] 実装進捗確認
- [ ] 課題・ブロッカーの特定
- [ ] 翌週の計画調整
- [ ] 品質指標のチェック

#### 🎯 マイルストーン

- **Week 1終了時**: 基本セットアップ完了
- **Week 2終了時**: 認証システム完了
- **Phase 1完了時**: Vercelデプロイ成功

### 9.2 品質管理

#### 🔍 コードレビュー基準

- TypeScript型エラー 0件
- ESLintエラー 0件
- テストカバレッジ 80%以上
- セキュリティチェック通過

#### 📊 KPI監視

- ページ読み込み時間 < 2秒
- First Contentful Paint < 1.5秒
- Cumulative Layout Shift < 0.1
- セキュリティスコア A評価

---

**作成日**: 2025年1月12日  
**バージョン**: 1.0  
**作成者**: AI駆動開発プロジェクト  
**承認者**: プロジェクトオーナー  
**有効期限**: Phase 1完了まで  
**次回レビュー**: Phase 1中間地点（1週間後）
