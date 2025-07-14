'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabaseクライアントをメモ化して再作成を防ぐ
  const supabase = useMemo(() => getSupabaseClient(), []);

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

  const signInDemo = useCallback(async () => {
    try {
      setError(null);
      logger.authEvent('Demo sign-in initiated');

      // デモ用のダミーユーザーを作成
      const demoUser = {
        id: 'demo-user-' + Date.now(),
        email: 'demo@taskshoot.com',
        user_metadata: {
          name: 'デモユーザー',
          full_name: 'デモユーザー',
          avatar_url: null,
        },
        app_metadata: {},
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: undefined,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        recovery_sent_at: undefined,
        invited_at: undefined,
        action_link: undefined,
        email_change: undefined,
        email_change_sent_at: undefined,
        email_change_token: undefined,
        email_change_confirm_status: 0,
        phone_change: undefined,
        phone_change_token: undefined,
        phone_change_sent_at: undefined,
        phone: undefined,
        phone_change_confirm_status: 0,
        banned_until: undefined,
        identities: []
      } as User;

      const demoSession = {
        access_token: 'demo-access-token',
        token_type: 'bearer',
        expires_in: 86400,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        refresh_token: 'demo-refresh-token',
        user: demoUser
      } as Session;

      setSession(demoSession);
      setUser(demoUser);
      setLoading(false);

      logger.authEvent('Demo sign-in completed', { userEmail: demoUser.email });
    } catch (error) {
      logger.error('Demo sign-in failed', error);
      setError('デモモードでのログインに失敗しました');
      throw error;
    }
  }, []);

  return {
    user,
    session,
    loading,
    error,
    signInWithGoogle,
    signInDemo,
    signOut,
  };
}
