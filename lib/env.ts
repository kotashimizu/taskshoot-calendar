/**
 * 環境変数の検証とバリデーション
 * 型安全な環境変数管理システム
 */

import { logger } from './logger'

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    const error = `Environment variable ${name} is required but not set`;
    logger.error('Missing environment variable', { variable: name });
    throw new Error(error);
  }
  return value;
}

function getOptionalEnvVar(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

function getBooleanEnvVar(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name]?.toLowerCase();
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}

function getNumberEnvVar(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number, got: ${value}`);
  }
  return parsed;
}

export const env = {
  // Supabase設定
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: getOptionalEnvVar('SUPABASE_SERVICE_ROLE_KEY'),

  // Google OAuth設定（開発環境では必須でない場合がある）
  GOOGLE_CLIENT_ID: getOptionalEnvVar('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: getOptionalEnvVar('GOOGLE_CLIENT_SECRET'),

  // Next.js設定
  NEXTAUTH_SECRET: getOptionalEnvVar('NEXTAUTH_SECRET'),
  NEXTAUTH_URL: getOptionalEnvVar('NEXTAUTH_URL', 'http://localhost:3000'),

  // アプリケーション設定
  NODE_ENV: getOptionalEnvVar('NODE_ENV', 'development'),

  // セキュリティ設定
  ENABLE_API_RATE_LIMITING: getBooleanEnvVar('ENABLE_API_RATE_LIMITING', true),
  MAX_REQUESTS_PER_MINUTE: getNumberEnvVar('MAX_REQUESTS_PER_MINUTE', 100),
  
  // ログレベル設定
  LOG_LEVEL: getOptionalEnvVar('LOG_LEVEL', 'info'),
  ENABLE_REQUEST_LOGGING: getBooleanEnvVar('ENABLE_REQUEST_LOGGING', false),

  // 開発環境かどうかの判定
  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },

  get isProduction() {
    return this.NODE_ENV === 'production';
  },

  get isTest() {
    return this.NODE_ENV === 'test';
  },

  // Supabase URL検証
  get isSupabaseConfigured() {
    return Boolean(this.NEXT_PUBLIC_SUPABASE_URL && this.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },

  // Google OAuth検証
  get isGoogleOAuthConfigured() {
    return Boolean(this.GOOGLE_CLIENT_ID && this.GOOGLE_CLIENT_SECRET);
  },
} as const;

/**
 * 安全な環境変数バリデーション（エラーをthrowしない）
 */
export function validateEnv(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
