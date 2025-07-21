/** @type {import('next').NextConfig} */

// セキュリティヘッダー設定
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data: https:;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self' https://*.supabase.co;
    `
      .replace(/\s{2,}/g, ' ')
      .trim(),
  },
];

const nextConfig = {
  // セキュリティ重視の設定
  poweredByHeader: false,

  // 環境変数は自動的に読み込まれます（NEXT_PUBLIC_プレフィックス）

  // 実験的機能
  experimental: {
    typedRoutes: true,
  },

  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // リダイレクト設定
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
        permanent: false,
      },
    ];
  },

  // 画像最適化
  images: {
    domains: [
      'lh3.googleusercontent.com', // Google OAuth profile images
      'avatars.githubusercontent.com', // GitHub avatars
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // TypeScript設定
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint設定
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
