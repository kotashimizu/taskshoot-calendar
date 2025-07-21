'use client';

/**
 * デバッグページ - 環境変数の確認
 * 本番環境では削除すること
 */

export default function DebugPage() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***SET***' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">環境変数デバッグ</h1>
      <div className="bg-gray-100 p-4 rounded">
        <pre>{JSON.stringify(envVars, null, 2)}</pre>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        本番環境では必ずこのページを削除してください
      </p>
    </div>
  );
}