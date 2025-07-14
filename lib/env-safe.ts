/**
 * セーフモードでの環境変数管理
 * ブラウザ側でエラーを投げないバージョン
 */

function getSafeEnvVar(name: string, defaultValue: string = ''): string {
  if (typeof window !== 'undefined') {
    // ブラウザ側では process.env が使えない場合がある
    return (window as any).__NEXT_DATA__?.props?.pageProps?.env?.[name] || defaultValue;
  }
  return process.env[name] || defaultValue;
}

export const envSafe = {
  // Supabase設定
  NEXT_PUBLIC_SUPABASE_URL: getSafeEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'https://tlfaicwciyiqwesfdvhl.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getSafeEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZmFpY3djaXlpcXdlc2ZkdmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTI1NTcsImV4cCI6MjA2Nzk4ODU1N30.8DpD5PZ1cBnb1otuxVgx7cpFNCIaQ-GSONfSHyRVu6s'),
  SUPABASE_SERVICE_ROLE_KEY: getSafeEnvVar('SUPABASE_SERVICE_ROLE_KEY'),

  // Google OAuth設定
  GOOGLE_CLIENT_ID: getSafeEnvVar('GOOGLE_CLIENT_ID', 'development_placeholder'),
  GOOGLE_CLIENT_SECRET: getSafeEnvVar('GOOGLE_CLIENT_SECRET', 'development_placeholder'),

  // Next.js設定
  NEXTAUTH_SECRET: getSafeEnvVar('NEXTAUTH_SECRET', 'development-secret'),
  NEXTAUTH_URL: getSafeEnvVar('NEXTAUTH_URL', 'http://localhost:3000'),

  // アプリケーション設定
  NODE_ENV: getSafeEnvVar('NODE_ENV', 'development'),
  NEXT_PUBLIC_DEMO_MODE: getSafeEnvVar('NEXT_PUBLIC_DEMO_MODE', 'true'),

  // 開発環境かどうかの判定
  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },

  get isProduction() {
    return this.NODE_ENV === 'production';
  },

  // Supabase URL検証
  get isSupabaseConfigured() {
    return Boolean(this.NEXT_PUBLIC_SUPABASE_URL && this.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },

  // Google OAuth検証
  get isGoogleOAuthConfigured() {
    return Boolean(this.GOOGLE_CLIENT_ID && this.GOOGLE_CLIENT_SECRET && 
                   this.GOOGLE_CLIENT_ID !== 'development_placeholder');
  },

  // デモモード
  get isDemoMode() {
    return this.NEXT_PUBLIC_DEMO_MODE === 'true';
  }
} as const;