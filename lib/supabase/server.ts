import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

export function createClient() {
  const cookieStore = cookies();

  try {
    return createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            try {
              return cookieStore.get(name)?.value;
            } catch (error) {
              logger.warn(`Failed to get cookie: ${name}`, error);
              return undefined;
            }
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Server Component内でcookieを設定する際のエラー
              // これは正常な動作の場合があるため、debugレベルでログ
              logger.debug(
                `Cannot set cookie in Server Component: ${name}`,
                error
              );
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // Server Component内でcookieを削除する際のエラー
              logger.debug(
                `Cannot remove cookie in Server Component: ${name}`,
                error
              );
            }
          },
        },
      }
    );
  } catch (error) {
    logger.error('Failed to create Supabase server client', error);
    throw new Error('Supabase server client initialization failed');
  }
}
