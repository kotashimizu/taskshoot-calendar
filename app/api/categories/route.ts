import { NextRequest, NextResponse } from 'next/server'
import { taskService } from '@/lib/services/tasks'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthorized access to categories API')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const categories = await taskService.getCategories(user.id)

    return NextResponse.json({
      data: categories,
      success: true
    })

  } catch (error) {
    logger.error('Error in GET /api/categories', error)
    
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

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthorized access to categories API')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // 必須フィールドの検証
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required', success: false },
        { status: 400 }
      )
    }

    const category = await taskService.createCategory(user.id, body)

    return NextResponse.json({
      data: category,
      success: true
    }, { status: 201 })

  } catch (error) {
    logger.error('Error in POST /api/categories', error)
    
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