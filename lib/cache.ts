/**
 * キャッシュユーティリティ
 * パフォーマンス向上のためのメモ化とキャッシング
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * メモリキャッシュ実装
 */
export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private readonly defaultTTL: number

  constructor(defaultTTL: number = 5 * 60 * 1000) { // デフォルト5分
    this.defaultTTL = defaultTTL
    
    // 定期的な期限切れエントリの削除
    setInterval(() => this.cleanup(), 60 * 1000) // 1分ごと
  }

  /**
   * キャッシュからデータを取得
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * キャッシュにデータを保存
   */
  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    }

    this.cache.set(key, entry)
  }

  /**
   * キャッシュからエントリを削除
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * キーパターンに基づく削除
   */
  deletePattern(pattern: RegExp): number {
    let deleted = 0
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        deleted++
      }
    }
    return deleted
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 期限切れエントリのクリーンアップ
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * キャッシュ統計情報
   */
  getStats(): {
    size: number
    keys: string[]
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

/**
 * 関数実行結果のメモ化
 */
export function memoize<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  keyGenerator?: (...args: TArgs) => string,
  ttl?: number
): (...args: TArgs) => TReturn {
  const cache = new MemoryCache<TReturn>(ttl)

  return (...args: TArgs): TReturn => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

/**
 * 非同期関数実行結果のメモ化
 */
export function memoizeAsync<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  keyGenerator?: (...args: TArgs) => string,
  ttl?: number
): (...args: TArgs) => Promise<TReturn> {
  const cache = new MemoryCache<TReturn>(ttl)
  const pending = new Map<string, Promise<TReturn>>()

  return async (...args: TArgs): Promise<TReturn> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    // キャッシュされた結果をチェック
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }

    // 進行中のリクエストをチェック
    const pendingPromise = pending.get(key)
    if (pendingPromise) {
      return pendingPromise
    }

    // 新しいリクエストを実行
    const promise = fn(...args)
    pending.set(key, promise)

    try {
      const result = await promise
      cache.set(key, result)
      return result
    } finally {
      pending.delete(key)
    }
  }
}

/**
 * Google Calendar API用のキャッシュ
 */
export const googleCalendarCache = new MemoryCache<any>(10 * 60 * 1000) // 10分

/**
 * カレンダー一覧のキャッシュキー生成
 */
export function getCalendarListCacheKey(userId: string): string {
  return `calendar_list:${userId}`
}

/**
 * イベント一覧のキャッシュキー生成
 */
export function getEventsCacheKey(
  userId: string,
  calendarId: string,
  timeMin?: Date,
  timeMax?: Date
): string {
  const timeRange = timeMin && timeMax 
    ? `:${timeMin.getTime()}-${timeMax.getTime()}`
    : ''
  return `events:${userId}:${calendarId}${timeRange}`
}

/**
 * タスク一覧のキャッシュキー生成
 */
export function getTasksCacheKey(userId: string, filters?: Record<string, any>): string {
  const filterKey = filters ? `:${JSON.stringify(filters)}` : ''
  return `tasks:${userId}${filterKey}`
}

/**
 * キャッシュの無効化
 */
export function invalidateUserCache(userId: string): void {
  const pattern = new RegExp(`^(calendar_list|events|tasks):${userId}`)
  googleCalendarCache.deletePattern(pattern)
}

/**
 * バッチ処理用のチャンク分割
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * 並列処理制限
 */
export async function limitConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number = 5
): Promise<R[]> {
  const results: R[] = []
  const chunks = chunk(items, limit)

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(fn))
    results.push(...chunkResults)
  }

  return results
}

/**
 * デバウンス処理
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>): void => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * スロットリング処理
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}