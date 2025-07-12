import { NextRequest } from 'next/server'
import { taskService } from '@/lib/services/tasks'
import { TaskUpdate } from '@/types/tasks'
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  parseRequestBody
} from '@/lib/api/auth-middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await authenticateRequest(_request)
    if (error) return error

    const task = await taskService.getTaskById(user!.id, params.id)

    if (!task) {
      return createErrorResponse(
        new Error('タスクが見つかりません'), 
        'Task not found', 
        404
      )
    }

    return createSuccessResponse(task)

  } catch (error) {
    return createErrorResponse(error, 'Failed to fetch task')
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error) return error

    const body = await parseRequestBody<TaskUpdate>(request)
    
    // セキュリティ: user_id と id の変更を防ぐ
    const { user_id, id, ...updateData } = body

    const task = await taskService.updateTask(user!.id, params.id, updateData)

    return createSuccessResponse(task, 200, 'タスクが正常に更新されました')

  } catch (error) {
    return createErrorResponse(error, 'Failed to update task')
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await authenticateRequest(_request)
    if (error) return error

    await taskService.deleteTask(user!.id, params.id)

    return createSuccessResponse(
      null, 
      200, 
      'タスクが正常に削除されました'
    )

  } catch (error) {
    return createErrorResponse(error, 'Failed to delete task')
  }
}