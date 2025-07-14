/**
 * アプリケーション全体のプロバイダーラッパー
 * 環境変数の初期化とエラーハンドリングを含む
 */

'use client';

import { ReactNode, useEffect, useState } from 'react';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import { initializeEnvironment, envManager } from '@/lib/env-runtime';
import { logger } from '@/lib/logger';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AppProvidersProps {
  children: ReactNode;
}

type InitializationState = 'loading' | 'ready' | 'error' | 'demo';

export function AppProviders({ children }: AppProvidersProps) {
  const [initState, setInitState] = useState<InitializationState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setError(null);
        logger.info('Initializing application environment...');
        
        await initializeEnvironment();
        
        if (!mounted) return;

        const diagnostics = envManager.getDiagnostics();
        logger.info('Environment initialization completed', diagnostics);

        if (diagnostics.isDemoMode) {
          setInitState('demo');
        } else {
          setInitState('ready');
        }
      } catch (error) {
        logger.error('Failed to initialize environment', error);
        
        if (!mounted) return;

        setError(error instanceof Error ? error.message : 'Unknown initialization error');
        setInitState('error');
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setInitState('loading');
  };

  const handleActivateDemo = () => {
    // デモモードを強制的に有効化
    envManager.getDiagnostics();
    setInitState('demo');
  };

  // ローディング状態
  if (initState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              アプリケーションを初期化中...
            </h2>
            <p className="text-sm text-gray-600 text-center">
              環境設定を確認しています
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // エラー状態
  if (initState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-900">初期化エラー</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              アプリケーションの初期化に失敗しました。
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-xs text-red-700 font-mono">
                  {error}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                再試行
              </Button>
              <Button 
                onClick={handleActivateDemo}
                size="sm"
                className="flex-1"
              >
                デモモードで開始
              </Button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <details>
                <summary className="cursor-pointer hover:text-gray-700">
                  診断情報を表示
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(envManager.getDiagnostics(), null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // デモモード状態の通知
  if (initState === 'demo') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* デモモード通知バナー */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="font-medium">デモモード</span>
              <span>一部の機能が制限されています</span>
            </div>
          </div>
        </div>

        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </div>
    );
  }

  // 正常状態
  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}