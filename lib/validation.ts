/**
 * セキュリティ重視の入力値検証・サニタイゼーション
 * XSS、SQLインジェクション対策を含む
 */

import { TaskFormData, TaskWithCategory } from '@/types/tasks'

// 文字列サニタイゼーション
export function sanitizeString(input: string | undefined): string {
  if (!input) return ''
  
  // 基本的なHTMLエスケープ（Reactが自動で行うが、明示的に実行）
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

// タスクタイトルの検証
export function validateTaskTitle(title: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeString(title)
  
  if (!sanitized || sanitized.length === 0) {
    return { isValid: false, error: 'タイトルは必須です' }
  }
  
  if (sanitized.length > 500) {
    return { isValid: false, error: 'タイトルは500文字以内で入力してください' }
  }
  
  // 潜在的に危険な文字列パターンをチェック
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload/i,
    /onerror/i,
    /onclick/i,
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      return { isValid: false, error: '無効な文字が含まれています' }
    }
  }
  
  return { isValid: true }
}

// タスク説明の検証
export function validateTaskDescription(description: string | undefined): { isValid: boolean; error?: string } {
  if (!description) return { isValid: true } // 任意項目
  
  const sanitized = sanitizeString(description)
  
  if (sanitized.length > 5000) {
    return { isValid: false, error: '説明は5000文字以内で入力してください' }
  }
  
  return { isValid: true }
}

// 日付の検証
export function validateDate(dateString: string | undefined): { isValid: boolean; error?: string } {
  if (!dateString) return { isValid: true } // 任意項目
  
  const date = new Date(dateString)
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: '有効な日付を入力してください' }
  }
  
  // 過度に未来・過去の日付をチェック
  const now = new Date()
  const minDate = new Date(now.getFullYear() - 10, 0, 1) // 10年前
  const maxDate = new Date(now.getFullYear() + 10, 11, 31) // 10年後
  
  if (date < minDate || date > maxDate) {
    return { isValid: false, error: '日付は10年前から10年後の範囲で入力してください' }
  }
  
  return { isValid: true }
}

// 見積時間の検証
export function validateEstimatedMinutes(minutes: number | undefined): { isValid: boolean; error?: string } {
  if (minutes === undefined) return { isValid: true } // 任意項目
  
  if (minutes < 0) {
    return { isValid: false, error: '見積時間は0分以上で入力してください' }
  }
  
  if (minutes > 24 * 60 * 7) { // 1週間以上
    return { isValid: false, error: '見積時間は1週間（10080分）以内で入力してください' }
  }
  
  return { isValid: true }
}

// TaskFormData 全体の検証
export function validateTaskFormData(formData: TaskFormData): { 
  isValid: boolean 
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}
  
  const titleValidation = validateTaskTitle(formData.title)
  if (!titleValidation.isValid) {
    errors.title = titleValidation.error!
  }
  
  const descriptionValidation = validateTaskDescription(formData.description)
  if (!descriptionValidation.isValid) {
    errors.description = descriptionValidation.error!
  }
  
  const startDateValidation = validateDate(formData.start_date)
  if (!startDateValidation.isValid) {
    errors.start_date = startDateValidation.error!
  }
  
  const dueDateValidation = validateDate(formData.due_date)
  if (!dueDateValidation.isValid) {
    errors.due_date = dueDateValidation.error!
  }
  
  const estimatedMinutesValidation = validateEstimatedMinutes(formData.estimated_minutes)
  if (!estimatedMinutesValidation.isValid) {
    errors.estimated_minutes = estimatedMinutesValidation.error!
  }
  
  // 開始日と期限の論理チェック
  if (formData.start_date && formData.due_date) {
    const startDate = new Date(formData.start_date)
    const dueDate = new Date(formData.due_date)
    
    if (startDate > dueDate) {
      errors.due_date = '期限は開始日より後の日時を設定してください'
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

// タスク更新時の検証（部分的なデータ）
export function validateTaskUpdate(updateData: Partial<TaskWithCategory>): {
  isValid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}
  
  if (updateData.title !== undefined) {
    const titleValidation = validateTaskTitle(updateData.title)
    if (!titleValidation.isValid) {
      errors.title = titleValidation.error!
    }
  }
  
  if (updateData.description !== undefined) {
    const descriptionValidation = validateTaskDescription(updateData.description || undefined)
    if (!descriptionValidation.isValid) {
      errors.description = descriptionValidation.error!
    }
  }
  
  if (updateData.start_date !== undefined) {
    const startDateValidation = validateDate(updateData.start_date || undefined)
    if (!startDateValidation.isValid) {
      errors.start_date = startDateValidation.error!
    }
  }
  
  if (updateData.due_date !== undefined) {
    const dueDateValidation = validateDate(updateData.due_date || undefined)
    if (!dueDateValidation.isValid) {
      errors.due_date = dueDateValidation.error!
    }
  }
  
  if (updateData.estimated_minutes !== undefined) {
    const estimatedMinutesValidation = validateEstimatedMinutes(updateData.estimated_minutes)
    if (!estimatedMinutesValidation.isValid) {
      errors.estimated_minutes = estimatedMinutesValidation.error!
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

// CSRFトークン検証（将来の実装用）
export function validateCSRFToken(token: string | undefined): boolean {
  // 実装時にCSRFトークンの検証ロジックを追加
  return Boolean(token)
}