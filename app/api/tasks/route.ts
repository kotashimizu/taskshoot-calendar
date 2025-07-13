import { NextRequest } from 'next/server'
import { taskService } from '@/lib/services/tasks'
import { TaskFilters, TaskSortOptions, TaskInsert } from '@/types/tasks'
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  parseRequestBody,
  getQueryParams
} from '@/lib/api/auth-middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error) return error

    const params = getQueryParams(request.url)
    
    // フィルタリングパラメータ
    const filters: TaskFilters = {}
    
    const status = params.getStringArray('status')
    if (status.length > 0) {
      filters.status = status as TaskFilters['status']
    }
    
    const priority = params.getStringArray('priority')
    if (priority.length > 0) {
      filters.priority = priority as TaskFilters['priority']
    }
    
    const categoryId = params.getStringArray('category_id')
    if (categoryId.length > 0) {
      filters.category_id = categoryId
    }
    
    const dueDateFrom = params.getString('due_date_from')
    if (dueDateFrom) {
      filters.due_date_from = dueDateFrom
    }
    
    const dueDateTo = params.getString('due_date_to')
    if (dueDateTo) {
      filters.due_date_to = dueDateTo
    }
    
    const search = params.getString('search')
    if (search) {
      filters.search = search
    }

    // ソートパラメータ
    const sort: TaskSortOptions = {
      field: (params.getString('sort_field') as TaskSortOptions['field']) || 'created_at',
      direction: (params.getString('sort_direction') as TaskSortOptions['direction']) || 'desc'
    }

    // ページネーション
    const limit = params.getNumber('limit')
    const offset = params.getNumber('offset')

    const tasks = await taskService.getTasks(
      user!.id, 
      Object.keys(filters).length > 0 ? filters : undefined, 
      sort, 
      limit || undefined, 
      offset || undefined
    )

    return createSuccessResponse(tasks)

  } catch (error) {
    return createErrorResponse(error, 'Failed to fetch tasks')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error) return error

    const body = await parseRequestBody<Omit<TaskInsert, 'user_id'>>(request)
    
    // 必須フィールドの検証
    if (!body.title?.trim()) {
      throw new Error('タスクのタイトルは必須です')
    }

    const task = await taskService.createTask(user!.id, { ...body, user_id: user!.id })

    return createSuccessResponse(task, 201, 'タスクが正常に作成されました')

  } catch (error) {
    return createErrorResponse(error, 'Failed to create task')
  }
}