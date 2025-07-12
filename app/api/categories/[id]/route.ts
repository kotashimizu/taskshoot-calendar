import { NextRequest, NextResponse } from 'next/server'
import { taskService } from '@/lib/services/tasks'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthorized access to category API')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // セキュリティ: user_id と id の変更を防ぐ
    const { user_id, id, ...updateData } = body

    const category = await taskService.updateCategory(user.id, params.id, updateData)

    return NextResponse.json({
      data: category,
      success: true
    })

  } catch (error) {
    logger.error('Error in PUT /api/categories/[id]', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthorized access to category API')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await taskService.deleteCategory(user.id, params.id)

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    })

  } catch (error) {
    logger.error('Error in DELETE /api/categories/[id]', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}