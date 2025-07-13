/**
 * タスクシュート統計 API
 * GET /api/taskshoot/stats - 統計データ取得
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { taskShootService } from '@/lib/services/taskshoot'
import { logger } from '@/lib/logger'

const querySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  analysis: z.enum(['basic', 'efficiency']).optional()
})

/**
 * GET /api/taskshoot/stats
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
    const { start_date, end_date, analysis } = querySchema.parse({
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      analysis: searchParams.get('analysis')
    })

    // 基本統計を取得
    const stats = await taskShootService.getStats(user.id, start_date, end_date)

    const result: any = { stats }

    // 効率性分析が要求された場合
    if (analysis === 'efficiency') {
      const efficiencyAnalysis = await taskShootService.getEfficiencyAnalysis(user.id)
      result.analysis = efficiencyAnalysis
    }

    // アクティブな記録があるかチェック
    const activeRecord = await taskShootService.getActiveRecord(user.id)
    if (activeRecord) {
      result.activeRecord = activeRecord
    }

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Get stats API error', { error })
    
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