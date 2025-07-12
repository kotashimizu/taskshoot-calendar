'use client';

import { useAuthContext } from '@/components/auth/auth-provider';
import { LoginForm } from '@/components/auth/login-form';
import { Header } from '@/components/layout/header';
import { Loader2 } from 'lucide-react';

export default function HomePage(): JSX.Element {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            ダッシュボード
          </h2>
          <p className="mb-8 text-gray-600">TaskShoot Calendarへようこそ！</p>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">タスク管理</h3>
              <p className="text-sm text-gray-600">
                効率的なタスク管理機能（開発中）
              </p>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">カレンダー表示</h3>
              <p className="text-sm text-gray-600">
                直感的なカレンダーUI（開発中）
              </p>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">Google連携</h3>
              <p className="text-sm text-gray-600">
                Googleカレンダー同期（開発中）
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
