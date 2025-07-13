/**
 * レート制限ユーティリティ
 * Google Calendar API等の外部API呼び出しを制限
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number = 100, windowMs: number = 60 * 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    
    // 定期的に古いエントリをクリーンアップ
    setInterval(() => this.cleanup(), windowMs)
  }

  /**
   * レート制限チェック
   */
  check(identifier: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now()
    const entry = this.requests.get(identifier)

    if (!entry || now > entry.resetTime) {
      // 新しいウィンドウの開始
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      })
      return { allowed: true }
    }

    if (entry.count >= this.maxRequests) {
      return { 
        allowed: false, 
        resetTime: entry.resetTime 
      }
    }

    // カウントを増加
    entry.count += 1
    return { allowed: true }
  }

  /**
   * 古いエントリをクリーンアップ
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key)
      }
    }
  }

  /**
   * 特定の識別子のレート制限をリセット
   */
  reset(identifier: string): void {
    this.requests.delete(identifier)
  }

  /**
   * 現在の使用状況を取得
   */
  getUsage(identifier: string): { count: number; limit: number; resetTime?: number } {
    const entry = this.requests.get(identifier)
    if (!entry || Date.now() > entry.resetTime) {
      return { count: 0, limit: this.maxRequests }
    }
    
    return {
      count: entry.count,
      limit: this.maxRequests,
      resetTime: entry.resetTime,
    }
  }
}

// シングルトンインスタンス
export const googleCalendarRateLimiter = new RateLimiter(100, 60 * 1000) // 1分間に100リクエスト
export const authRateLimiter = new RateLimiter(10, 60 * 1000) // 認証は1分間に10リクエスト

/**
 * レート制限ミドルウェア
 */
export function withRateLimit(
  rateLimiter: RateLimiter,
  getIdentifier: (request: Request) => string = () => 'global'
) {
  return function rateLimitMiddleware(
    handler: (request: Request) => Promise<Response>
  ) {
    return async function(request: Request): Promise<Response> {
      const identifier = getIdentifier(request)
      const { allowed, resetTime } = rateLimiter.check(identifier)

      if (!allowed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            resetTime,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': resetTime ? Math.ceil((resetTime - Date.now()) / 1000).toString() : '60',
            },
          }
        )
      }

      return handler(request)
    }
  }
}

/**
 * ユーザーIDベースの識別子を取得
 */
export function getUserIdentifier(userId: string): string {
  return `user:${userId}`
}

/**
 * IPベースの識別子を取得
 */
export function getIPIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0]?.trim() || 'unknown' : 'unknown'
  return `ip:${ip}`
}