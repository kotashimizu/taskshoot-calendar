/**
 * API認証ミドルウェア
 * 全APIルートで共通する認証チェック処理
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export interface AuthenticatedUser {
  id: string
  email?: string
}

export interface ApiResponse<T> {
  data?: T
  success: boolean
  error?: string
  message?: string
}

/**
 * 認証チェックとユーザー情報取得
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  user: AuthenticatedUser | null
  error: NextResponse | null
}> {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      logger.warn('Authentication error in API request', { 
        path: request.nextUrl.pathname,
        error: authError.message 
      })
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Authentication failed', success: false } satisfies ApiResponse<never>,
          { status: 401 }
        )
      }
    }

    if (!user) {
      logger.warn('Unauthorized access attempt', { 
        path: request.nextUrl.pathname,
        userAgent: request.headers.get('user-agent')
      })
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Unauthorized', success: false } satisfies ApiResponse<never>,
          { status: 401 }
        )
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email
      },
      error: null
    }
  } catch (error) {
    logger.error('Unexpected error in authentication middleware', error)
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Internal server error', success: false } satisfies ApiResponse<never>,
        { status: 500 }
      )
    }
  }
}

/**
 * API エラーレスポンス生成
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred',
  defaultStatus: number = 500
): NextResponse {
  if (error instanceof Error) {
    logger.error('API Error', { 
      message: error.message, 
      stack: error.stack 
    })
    
    // バリデーションエラーかビジネスロジックエラーの場合
    if (error.message.includes('必須') || 
        error.message.includes('文字以内') || 
        error.message.includes('失敗しました')) {
      return NextResponse.json(
        { error: error.message, success: false } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }
  }

  logger.error('Unexpected API error', error)
  return NextResponse.json(
    { error: defaultMessage, success: false } satisfies ApiResponse<never>,
    { status: defaultStatus }
  )
}

/**
 * 成功レスポンス生成
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse {
  const response: ApiResponse<T> = {
    data,
    success: true
  }
  
  if (message) {
    response.message = message
  }

  return NextResponse.json(response, { status })
}

/**
 * リクエストボディのパース（型安全）
 */
export async function parseRequestBody<T>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json()
    return body as T
  } catch (error) {
    throw new Error('Invalid JSON in request body')
  }
}

/**
 * クエリパラメータの取得（型安全）
 */
export function getQueryParams(url: string) {
  const { searchParams } = new URL(url)
  
  return {
    getString: (key: string): string | null => searchParams.get(key),
    getStringArray: (key: string): string[] => {
      const value = searchParams.get(key)
      return value ? value.split(',') : []
    },
    getNumber: (key: string): number | null => {
      const value = searchParams.get(key)
      return value ? parseInt(value, 10) : null
    },
    getBoolean: (key: string): boolean | null => {
      const value = searchParams.get(key)
      return value ? value === 'true' : null
    }
  }
}