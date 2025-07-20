'use client'

/**
 * TaskShoot インライン編集可能タスク行
 * - タイトル直接編集
 * - プロジェクト、モード、タグ選択
 * - 再生ボタン統合
 */

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Play, 
  Clock,
  User,
  Folder,
  Settings,
  Tag,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Task } from '@/types/tasks'

// Simplified task interface for inline editing
interface EditableTaskData {
  id?: string
  title: string
  priority?: string
  status?: string
  estimated_minutes?: number
  tags?: string[]
  // Additional properties for inline editing UI
  project?: string
  mode?: string
}

interface InlineTaskRowProps {
  task?: Task
  isNew?: boolean
  onSave: (taskData: Partial<EditableTaskData>) => void
  onCancel?: () => void
  onPlay?: (task: Task) => void
  className?: string
}

const PROJECTS = ['プロジェクト', 'プロジェクトA', 'プロジェクトB', 'プロジェクトC']
const MODES = ['モード', '集中', 'レビュー', '調査', '開発']
const AVAILABLE_TAGS = ['重要', '緊急', 'バグ修正', '新機能', 'リファクタリング']

const TIME_ESTIMATES = [
  { label: '実際の値：未入力', value: 0 },
  { label: '実績時間の平均', value: -1 }, // 特別な値として-1を使用
  { label: '5分間', value: 5 },
  { label: '10分間', value: 10 },
  { label: '15分間', value: 15 },
  { label: '20分間', value: 20 },
  { label: '30分間', value: 30 },
  { label: '45分間', value: 45 },
  { label: '1時間', value: 60 },
  { label: '1時間30分', value: 90 },
  { label: '2時間', value: 120 },
  { label: '3時間', value: 180 },
]

export function InlineTaskRow({ 
  task, 
  isNew = false, 
  onSave, 
  onCancel, 
  onPlay,
  className 
}: InlineTaskRowProps) {
  const [isEditing, setIsEditing] = useState(isNew)
  const [title, setTitle] = useState(task?.title || '')
  const [project, setProject] = useState('')
  const [mode, setMode] = useState('')
  const [tags, setTags] = useState<string[]>(task?.tags || [])
  const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimated_minutes || 0)
  
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    if (!title.trim()) return
    
    onSave({
      id: task?.id,
      title: title.trim(),
      project: project || undefined,
      mode: mode || undefined,
      tags: tags.length > 0 ? tags : undefined,
      estimated_minutes: estimatedMinutes || undefined,
      priority: task?.priority || 'medium',
      status: task?.status || 'pending'
    })
    
    if (isNew) {
      // 新規作成後はフォームをリセット
      setTitle('')
      setProject('')
      setMode('')
      setTags([])
      setEstimatedMinutes(0)
    } else {
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    if (isNew) {
      setTitle('')
      setProject('')
      setMode('')
      setTags([])
      setEstimatedMinutes(0)
      onCancel?.()
    } else {
      setTitle(task?.title || '')
      setProject('')
      setMode('')
      setTags(task?.tags || [])
      setEstimatedMinutes(task?.estimated_minutes || 0)
      setIsEditing(false)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (!task) return
    
    // ドラッグ中のタスクデータを設定
    const dragData = {
      id: task.id,
      title: task.title,
      estimated_minutes: task.estimated_minutes,
      priority: task.priority,
      tags: task.tags
    }
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'move'
    
    // ドラッグ中の視覚的フィードバック
    e.currentTarget.style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    // ドラッグ終了時に透明度を元に戻す
    e.currentTarget.style.opacity = '1'
  }

  const addTag = (tagName: string) => {
    if (!tags.includes(tagName)) {
      setTags([...tags, tagName])
    }
  }

  const removeTag = (tagName: string) => {
    setTags(tags.filter(t => t !== tagName))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-3 p-3 border rounded-lg bg-blue-50 border-blue-200", className)}>
        {/* 再生ボタン */}
        <Button 
          size="sm" 
          variant="default" 
          className="h-8 w-8 p-0 rounded-full"
          disabled
        >
          <Play className="h-4 w-4" />
        </Button>

        {/* 編集フォーム */}
        <div className="flex-1 space-y-2">
          {/* タイトル入力 */}
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="タスク名もしくは '/' コマンド"
            className="font-medium"
          />

          {/* メタデータ行 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* プロジェクト選択 */}
            <Select value={project} onValueChange={setProject}>
              <SelectTrigger className="w-auto h-7 text-xs">
                <SelectValue placeholder="プロジェクト" />
              </SelectTrigger>
              <SelectContent>
                {PROJECTS.map((proj) => (
                  <SelectItem key={proj} value={proj}>
                    <div className="flex items-center gap-1">
                      <Folder className="h-3 w-3" />
                      {proj}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* モード選択 */}
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-auto h-7 text-xs">
                <SelectValue placeholder="モード" />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    <div className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      {m}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* タグ */}
            <div className="flex items-center gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="h-6 text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
              
              <Select onValueChange={addTag}>
                <SelectTrigger className="w-auto h-7 text-xs">
                  <SelectValue placeholder="タグ" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_TAGS.filter(tag => !tags.includes(tag)).map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 見積時間 */}
            <Select 
              value={estimatedMinutes?.toString() || '0'} 
              onValueChange={(value) => setEstimatedMinutes(parseInt(value))}
            >
              <SelectTrigger className="w-auto h-7 text-xs">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-gray-500" />
                  <SelectValue placeholder="時間を選択" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {TIME_ESTIMATES.map((estimate) => (
                  <SelectItem key={estimate.value} value={estimate.value.toString()}>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {estimate.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
            保存
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
        </div>
      </div>
    )
  }

  // 表示モード
  if (!task) return null

  return (
    <div 
      className={cn("flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer", className)}
      onClick={() => setIsEditing(true)}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* 再生ボタン */}
      <Button 
        size="sm" 
        variant="default" 
        className="h-8 w-8 p-0 rounded-full"
        onClick={(e) => {
          e.stopPropagation()
          onPlay?.(task)
        }}
      >
        <Play className="h-4 w-4" />
      </Button>

      {/* タスク情報 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className={cn("w-2 h-2 rounded-full", getPriorityColor(task.priority))} />
          <span className="font-medium text-sm text-gray-900 truncate">
            {task.title}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {task.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="h-5 text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* 統計情報 */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <User className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">--:--</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">--:--</span>
        </div>
        {task.estimated_minutes && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">{task.estimated_minutes}分</span>
          </div>
        )}
        <div className="text-gray-600">→</div>
        <div className="text-gray-600">--:--</div>
      </div>
    </div>
  )
}