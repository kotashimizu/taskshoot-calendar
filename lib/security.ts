/**
 * セキュリティユーティリティ
 * 本番環境での安全性を確保するためのヘルパー関数
 */

import crypto from 'crypto'

/**
 * 機密情報のサニタイゼーション
 */
export function sanitizeForLogging(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  const sensitiveKeys = [
    'access_token',
    'refresh_token',
    'client_secret',
    'password',
    'secret',
    'key',
    'authorization',
  ]

  const sanitized = { ...data }

  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive.toLowerCase())
    )) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key])
    }
  }

  return sanitized
}

/**
 * 安全なエラーレスポンス生成
 */
export function createSafeErrorResponse(
  error: unknown,
  userMessage: string = 'An error occurred',
  statusCode: number = 500
) {
  // 本番環境では詳細なエラー情報を隠す
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  const response = {
    error: userMessage,
    ...(isDevelopment && {
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }),
  }

  // ログ出力（サニタイズ済み）
  if (error instanceof Error) {
    console.error('Error occurred:', {
      message: error.message,
      stack: isDevelopment ? error.stack : '[REDACTED]',
      userMessage,
      statusCode,
    })
  }

  return { response, statusCode }
}

/**
 * 入力値の安全な文字列化
 */
export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * 安全なJSON解析
 */
export function safeJSONParse<T = unknown>(
  value: string,
  fallback: T
): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

/**
 * タイミング攻撃を防ぐための安全な文字列比較
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * CSRF トークンの生成
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * 安全なランダム文字列生成
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length)
}

/**
 * パスワード強度チェック
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * SQLインジェクション対策のための文字列エスケープ
 */
export function escapeSQLString(input: string): string {
  return input.replace(/'/g, "''")
}

/**
 * XSS対策のためのHTML文字エスケープ
 */
export function escapeHTML(input: string): string {
  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }

  return input.replace(/[&<>"'/]/g, (char) => entityMap[char] || char)
}

/**
 * 環境変数の安全な取得
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`)
  }
  return value
}

/**
 * 機密データのマスキング
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length)
  }
  
  const visible = data.slice(-visibleChars)
  const masked = '*'.repeat(data.length - visibleChars)
  return masked + visible
}

/**
 * URL検証
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * ドメイン許可リストチェック
 */
export function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  try {
    const parsedURL = new URL(url)
    return allowedDomains.includes(parsedURL.hostname)
  } catch {
    return false
  }
}