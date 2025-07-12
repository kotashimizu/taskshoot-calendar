'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthContext } from './auth-provider';
import { useToastEnhanced } from '@/hooks/use-toast-enhanced';
import { Loader2, AlertCircle } from 'lucide-react';

// GoogleアイコンをSVGコンポーネントとして分離
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, error } = useAuthContext();
  const { showError } = useToastEnhanced();

  const handleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error) {
      showError(
        'Googleでのログインに失敗しました。時間をおいて再度お試しください。',
        error instanceof Error ? error : undefined
      );
    } finally {
      setLoading(false);
    }
  }, [signInWithGoogle, showError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            TaskShoot Calendar
          </CardTitle>
          <CardDescription className="text-gray-600">
            Googleアカウントでログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full bg-blue-600 text-white transition-colors hover:bg-blue-700"
            size="lg"
            aria-label="Googleアカウントでログイン"
          >
            {loading ? (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            {loading ? 'ログイン中...' : 'Googleでログイン'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
