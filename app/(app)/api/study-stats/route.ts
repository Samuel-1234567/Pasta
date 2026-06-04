import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { EMPTY_STUDY_STATS, isStudyEventsTableMissing } from '@/app/lib/study-events-table'
import {
  aggregateStudyEvents,
  computeStreakDays,
  startOfUtcDay,
  type StudyStats,
} from '@/app/lib/study-stats'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId || !isUuid(userId)) {
    return NextResponse.json({ error: 'Missing or invalid userId.' }, { status: 400 })
  }

  const todayStart = startOfUtcDay()
  const lookbackStart = new Date(todayStart)
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - 366)

  const supabase = createSupabaseServerClient()

  const { data: rows, error } = await supabase
    .from('study_events')
    .select('event_type, quantity, occurred_at')
    .eq('profile_id', userId)
    .gte('occurred_at', lookbackStart.toISOString())

  if (error) {
    if (isStudyEventsTableMissing(error)) {
      return NextResponse.json(EMPTY_STUDY_STATS satisfies StudyStats)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { cardsReviewedToday, studySecondsToday, activeDayKeys } = aggregateStudyEvents(
    (rows ?? []) as Array<{ event_type: string; quantity: number; occurred_at: string }>,
    todayStart.getTime(),
  )

  const stats: StudyStats = {
    studyMinutesToday: Math.round(studySecondsToday / 60),
    cardsReviewedToday,
    streakDays: computeStreakDays(activeDayKeys),
  }

  return NextResponse.json(stats)
}
