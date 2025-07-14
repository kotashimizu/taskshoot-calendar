import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers/app-providers';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TaskShoot Calendar',
  description: 'Googleカレンダーと連携したタスク管理アプリケーション',
  keywords: ['タスク管理', 'カレンダー', 'スケジュール', 'Google Calendar'],
  authors: [{ name: 'TaskShoot Calendar Team' }],
  creator: 'TaskShoot Calendar',
  publisher: 'TaskShoot Calendar',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    title: 'TaskShoot Calendar',
    description: 'Googleカレンダーと連携したタスク管理アプリケーション',
    siteName: 'TaskShoot Calendar',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaskShoot Calendar',
    description: 'Googleカレンダーと連携したタスク管理アプリケーション',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={notoSansJP.variable}>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
