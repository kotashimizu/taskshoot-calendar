import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { logger } from '@/lib/logger';

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

// 安全な環境変数取得関数
function getSafeEnvVar(key: string, fallback: string = ''): string {
  // サーバーサイド
  if (typeof window === 'undefined') {
    return process.env[key] || fallback;
  }
  
  // クライアントサイド - 複数の方法で取得を試行
  return process.env[key] || 
         (window as any).__NEXT_DATA__?.env?.[key] ||
         (window as any).__ENV__?.[key] ||
         fallback;
}

export function createClient() {
  // シングルトンパターンでクライアントインスタンスを再利用
  if (clientInstance) {
    return clientInstance;
  }

  try {
    const supabaseUrl = getSafeEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'https://tlfaicwciyiqwesfdvhl.supabase.co');
    const supabaseKey = getSafeEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZmFpY3djaXlpcXdlc2ZkdmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTI1NTcsImV4cCI6MjA2Nzk4ODU1N30.8DpD5PZ1cBnb1otuxVgx7cpFNCIaQ-GSONfSHyRVu6s');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    clientInstance = createBrowserClient<Database>(supabaseUrl, supabaseKey);

    logger.debug('Supabase browser client created', { 
      url: supabaseUrl.substring(0, 20) + '...',
      hasKey: !!supabaseKey 
    });
    
    return clientInstance;
  } catch (error) {
    logger.error('Failed to create Supabase browser client', error);
    
    // フォールバック: ダミークライアントを作成（デモモード用）
    try {
      clientInstance = createBrowserClient<Database>(
        'https://demo.supabase.co',
        'demo-key'
      );
      logger.warn('Using demo Supabase client due to configuration error');
      return clientInstance;
    } catch (fallbackError) {
      logger.error('Failed to create fallback client', fallbackError);
      throw new Error('Supabase client initialization failed completely');
    }
  }
}

// 遅延初期化：実際に必要になったときだけクライアントを作成
export function getSupabaseClient() {
  return createClient();
}
