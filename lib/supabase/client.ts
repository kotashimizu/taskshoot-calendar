import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { logger } from '@/lib/logger';

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null =
  null;


export function createClient() {
  // シングルトンパターンでクライアントインスタンスを再利用
  if (clientInstance) {
    return clientInstance;
  }

  try {
    // 環境変数を直接取得
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tlfaicwciyiqwesfdvhl.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZmFpY3djaXlpcXdlc2ZkdmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTI1NTcsImV4cCI6MjA2Nzk4ODU1N30.8DpD5PZ1cBnb1otuxVgx7cpFNCIaQ-GSONfSHyRVu6s';

    // デバッグ情報
    logger.debug('Environment variables check', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      isClient: typeof window !== 'undefined',
      urlPrefix: supabaseUrl?.substring(0, 20) + '...',
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    clientInstance = createBrowserClient<Database>(supabaseUrl, supabaseKey);

    logger.debug('Supabase browser client created', {
      url: supabaseUrl.substring(0, 20) + '...',
      hasKey: !!supabaseKey,
    });

    return clientInstance;
  } catch (error) {
    logger.error('Failed to create Supabase browser client', error);
    throw new Error(`Failed to initialize Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 遅延初期化：実際に必要になったときだけクライアントを作成
export function getSupabaseClient() {
  return createClient();
}
