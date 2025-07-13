import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

export function createClient() {
  // シングルトンパターンでクライアントインスタンスを再利用
  if (clientInstance) {
    return clientInstance;
  }

  try {
    clientInstance = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    logger.debug('Supabase browser client created');
    return clientInstance;
  } catch (error) {
    logger.error('Failed to create Supabase browser client', error);
    throw new Error('Supabase client initialization failed');
  }
}

// デフォルトエクスポートとしてクライアントインスタンスを提供
export const supabase = createClient()
