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
      logger.warn('Unauthorized access to task stats API')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stats = await taskService.getTaskStats(user.id)

    return NextResponse.json({
      data: stats,
      success: true
    })

  } catch (error) {
    logger.error('Error in GET /api/tasks/stats', error)
    
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