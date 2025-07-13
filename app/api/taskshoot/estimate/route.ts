/**
 * タスクシュート見積もり API
 * POST /api/taskshoot/estimate - 時間見積もり作成
 * GET /api/taskshoot/estimate?task_id=xxx - 見積もり取得
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { taskShootService } from '@/lib/services/taskshoot'
import { logger } from '@/lib/logger'

const createEstimateSchema = z.object({
  task_id: z.string().uuid(),
  estimated_minutes: z.number().min(1).max(10080), // 最大1週間
  confidence_level: z.number().min(0).max(100).optional(),
  notes: z.string().optional()
})

const querySchema = z.object({
  task_id: z.string().uuid()
})

/**
 * GET /api/taskshoot/estimate
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const { task_id } = querySchema.parse({
      task_id: searchParams.get('task_id')
    })

    const estimate = await taskShootService.getEstimate(user.id, task_id)

    return NextResponse.json({
      success: true,
      data: estimate
    })
  } catch (error) {
    logger.error('Get estimate API error', { error })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/taskshoot/estimate
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
    const { task_id, estimated_minutes, confidence_level, notes } = createEstimateSchema.parse(body)

    const estimate = await taskShootService.createEstimate(
      user.id,
      task_id,
      estimated_minutes,
      confidence_level,
      notes
    )

    return NextResponse.json({
      success: true,
      data: estimate,
      message: '見積もりを作成しました'
    }, { status: 201 })
  } catch (error) {
    logger.error('Create estimate API error', { error })
    
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