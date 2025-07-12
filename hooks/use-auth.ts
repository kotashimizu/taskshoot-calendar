'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabaseクライアントをメモ化して再作成を防ぐ
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        setError(null);
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          logger.authEvent('Session retrieved', { hasUser: !!session?.user });
        }
      } catch (error) {
        logger.error('Failed to get session', error);
        if (mounted) {
          setError('セッションの取得に失敗しました');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.authEvent(`Auth state changed: ${event}`, {
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
      });

      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      logger.authEvent('Google sign-in initiated');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Google sign-in failed', error);
      setError('Googleでのログインに失敗しました');
      throw error;
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      logger.authEvent('Sign-out initiated');

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      logger.authEvent('Sign-out completed');
    } catch (error) {
      logger.error('Sign-out failed', error);
      setError('ログアウトに失敗しました');
      throw error;
    }
  }, [supabase]);

  return {
    user,
    session,
    loading,
    error,
    signInWithGoogle,
    signOut,
  };
}
