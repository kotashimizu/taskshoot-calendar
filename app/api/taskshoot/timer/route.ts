/**
 * タスクシュートタイマー API
 * POST /api/taskshoot/timer - タイマー開始・停止
 * GET /api/taskshoot/timer - タイマー状態取得
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { taskShootService } from '@/lib/services/taskshoot'
import { logger } from '@/lib/logger'

const timerActionSchema = z.object({
  action: z.enum(['start', 'stop']),
  task_id: z.string().uuid().optional(),
  record_id: z.string().uuid().optional(),
  productivity_rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional()
})

/**
 * GET /api/taskshoot/timer
 */
export async function GET() {
  try {
    const timerState = taskShootService.getTimerState()
    
    return NextResponse.json({
      success: true,
      data: timerState
    })
  } catch (error) {
    logger.error('Get timer state API error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/taskshoot/timer
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, task_id, record_id, productivity_rating, notes } = timerActionSchema.parse(body)

    let result
    let message

    switch (action) {
      case 'start':
        if (!task_id) {
          return NextResponse.json(
            { error: 'task_id is required for start action' },
            { status: 400 }
          )
        }
        result = await taskShootService.startTimer(user.id, task_id, notes)
        message = 'タイマーを開始しました'
        break

      case 'stop':
        if (!record_id) {
          return NextResponse.json(
            { error: 'record_id is required for stop action' },
            { status: 400 }
          )
        }
        result = await taskShootService.stopTimer(user.id, record_id, productivity_rating, notes)
        message = 'タイマーを停止しました'
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    const timerState = taskShootService.getTimerState()

    return NextResponse.json({
      success: true,
      data: {
        record: result,
        timer: timerState
      },
      message
    })
  } catch (error) {
    logger.error('Timer action API error', { error })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}