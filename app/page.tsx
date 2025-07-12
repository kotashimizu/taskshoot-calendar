export default function HomePage(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">TaskShoot Calendar</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Googleカレンダーと連携したタスク管理アプリケーション
        </p>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-2 text-xl font-semibold">開発中</h2>
          <p className="text-sm text-muted-foreground">
            セキュリティ重視のAI駆動開発によるタスク管理ツール
          </p>
        </div>
      </div>
    </main>
  );
}
