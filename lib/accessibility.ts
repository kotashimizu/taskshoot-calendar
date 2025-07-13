/**
 * アクセシビリティ対応ユーティリティ
 * WCAG 2.1 AA準拠
 */

// カラーコントラスト比計算
export function calculateContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    // 16進数カラーを0-1の値に変換
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    
    // 相対輝度計算
    const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
    const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
    const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)
    
    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB
  }
  
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}

// WCAG適合レベルチェック
export function checkWCAGCompliance(backgroundColor: string, textColor: string): {
  ratio: number
  aa: boolean
  aaa: boolean
  level: 'fail' | 'aa' | 'aaa'
} {
  const ratio = calculateContrastRatio(backgroundColor, textColor)
  const aa = ratio >= 4.5
  const aaa = ratio >= 7
  
  return {
    ratio,
    aa,
    aaa,
    level: aaa ? 'aaa' : aa ? 'aa' : 'fail'
  }
}

// アクセシブルなカラーパレット
export const ACCESSIBLE_COLORS = {
  // WCAG AAA準拠カラー
  backgrounds: {
    primary: '#1e40af',     // blue-800
    success: '#166534',     // green-800  
    warning: '#92400e',     // amber-800
    danger: '#991b1b',      // red-800
    neutral: '#374151',     // gray-700
  },
  text: {
    onPrimary: '#ffffff',
    onSuccess: '#ffffff', 
    onWarning: '#ffffff',
    onDanger: '#ffffff',
    onNeutral: '#ffffff',
  }
} as const

// フォーカス管理
export function manageFocus(element: HTMLElement | null): void {
  if (!element) return
  
  element.focus()
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// キーボードナビゲーション用ヘルパー
export function handleKeyboardNavigation(
  event: KeyboardEvent,
  actions: {
    onEnter?: () => void
    onSpace?: () => void  
    onEscape?: () => void
    onTab?: () => void
    onArrowUp?: () => void
    onArrowDown?: () => void
    onArrowLeft?: () => void
    onArrowRight?: () => void
  }
): void {
  switch (event.key) {
    case 'Enter':
      actions.onEnter?.()
      break
    case ' ':
      actions.onSpace?.()
      break
    case 'Escape':
      actions.onEscape?.()
      break
    case 'Tab':
      actions.onTab?.()
      break
    case 'ArrowUp':
      actions.onArrowUp?.()
      break
    case 'ArrowDown':
      actions.onArrowDown?.()
      break
    case 'ArrowLeft':
      actions.onArrowLeft?.()
      break
    case 'ArrowRight':
      actions.onArrowRight?.()
      break
  }
}

// スクリーンリーダー用テキスト生成
export function generateScreenReaderText(task: {
  title: string
  status: string
  priority: string
  due_date?: string
}): string {
  const parts = [
    `タスク: ${task.title}`,
    `ステータス: ${task.status}`,
    `優先度: ${task.priority}`,
  ]
  
  if (task.due_date) {
    const dueDate = new Date(task.due_date)
    const dateStr = dueDate.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    parts.push(`期限: ${dateStr}`)
  }
  
  return parts.join(', ')
}

// アニメーション制御（motion sensitivity対応）
export function respectsReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// アクセシブルなイベントハンドラー
export function createAccessibleClickHandler(
  onClick: () => void,
  options?: {
    preventPropagation?: boolean
    preventDefault?: boolean
  }
) {
  return (event: React.KeyboardEvent | React.MouseEvent) => {
    if (options?.preventDefault) {
      event.preventDefault()
    }
    if (options?.preventPropagation) {
      event.stopPropagation()
    }
    
    // キーボードイベントの場合、EnterまたはSpaceキーのみ反応
    if ('key' in event) {
      if (event.key === 'Enter' || event.key === ' ') {
        onClick()
      }
    } else {
      // マウスイベントの場合は常に実行
      onClick()
    }
  }
}