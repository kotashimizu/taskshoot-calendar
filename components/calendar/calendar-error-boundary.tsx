'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * カレンダーコンポーネント専用のエラーバウンダリ
 */
export class CalendarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // エラー情報をログに記録
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Calendar Error Boundary caught an error:', error, errorInfo)
    }

    // 外部エラー処理関数を呼び出し
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    })
  }

  override render() {
    if (this.state.hasError) {
      // カスタムフォールバックがある場合はそれを使用
      if (this.props.fallback) {
        return this.props.fallback
      }

      // デフォルトのエラー表示
      return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-red-700">
              カレンダーの表示中にエラーが発生しました
            </CardTitle>
            <CardDescription>
              申し訳ございません。カレンダーの読み込み中に問題が発生しました。
              ページを再読み込みするか、しばらく待ってから再度お試しください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="bg-gray-50 p-4 rounded-md">
                <summary className="cursor-pointer font-medium text-sm text-gray-700 mb-2">
                  エラーの詳細（開発者向け）
                </summary>
                <div className="text-xs text-gray-600 space-y-2">
                  <div>
                    <strong>エラーメッセージ:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{this.state.error.message}</pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>スタックトレース:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>コンポーネントスタック:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex justify-center space-x-4">
              <Button onClick={this.handleRetry} className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4" />
                <span>再試行</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>ページを再読み込み</span>
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>問題が続く場合は、ブラウザのキャッシュをクリアしてください。</p>
              <p className="mt-1">
                それでも解決しない場合は、サポートまでお問い合わせください。
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

/**
 * 関数コンポーネント版のエラーバウンダリラッパー
 */
interface CalendarErrorWrapperProps {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

export function CalendarErrorWrapper({ children, onError }: CalendarErrorWrapperProps) {
  return (
    <CalendarErrorBoundary onError={onError}>
      {children}
    </CalendarErrorBoundary>
  )
}

/**
 * 軽量版エラーフォールバック
 */
export function LightweightErrorFallback({ 
  error, 
  onRetry 
}: { 
  error?: Error
  onRetry: () => void 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        カレンダーを読み込めませんでした
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {error?.message || '予期しないエラーが発生しました'}
      </p>
      <Button onClick={onRetry} size="sm">
        再試行
      </Button>
    </div>
  )
}