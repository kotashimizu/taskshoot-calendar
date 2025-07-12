# TaskShoot Calendar - Production Dockerfile
# セキュリティ重視のNext.js 14アプリケーション用

# Node.js 18 Alpine (セキュリティアップデート済み)
FROM node:18-alpine AS base

# 依存関係インストール用ステージ
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 依存関係ファイルをコピー
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# ビルド用ステージ
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js telemetryを無効化
ENV NEXT_TELEMETRY_DISABLED 1

# プロダクションビルド
RUN npm run build

# 本番実行用ステージ
FROM base AS runner
WORKDIR /app

# セキュリティ：非rootユーザーでの実行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 必要なファイルのみコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 環境変数設定
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 非rootユーザーに切り替え
USER nextjs

# ポート公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# アプリケーション起動
CMD ["node", "server.js"]