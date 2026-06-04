import { NextResponse } from 'next/server'
import { isStudyEventsTableMissing } from '@/app/lib/study-events-table'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'

type StudyEventInput = {
  type: 'card_reviewed' | 'session_seconds'
  quantity?: number
}

type StudyEventsPayload = {
  userId: string
  deckId?: string
  events: StudyEventInput[]
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as StudyEventsPayload | null
  const userId = String(body?.userId ?? '').trim()
  const deckId = body?.deckId ? String(body.deckId).trim() : null
  const events = Array.isArray(body?.events) ? body!.events : []

  if (!isUuid(userId)) {
    return NextResponse.json({ error: 'Invalid userId.' }, { status: 400 })
  }
  if (deckId && !isUuid(deckId)) {
    return NextResponse.json({ error: 'Invalid deckId.' }, { status: 400 })
  }
  if (events.length === 0) {
    return NextResponse.json({ error: 'No events provided.' }, { status: 400 })
  }

  const rows = events.slice(0, 50).map((event) => {
    const type = event?.type
    if (type !== 'card_reviewed' && type !== 'session_seconds') {
      return null
    }
    const rawQty = event.quantity ?? 1
    const quantity = Math.min(86400, Math.max(1, Math.floor(Number(rawQty)) || 1))
    return {
      profile_id: userId,
      deck_id: deckId,
      event_type: type,
      quantity,
    }
  })

  if (rows.some((r) => r === null)) {
    return NextResponse.json({ error: 'Invalid event type.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('study_events').insert(rows)

  if (error) {
    if (isStudyEventsTableMissing(error)) {
      return NextResponse.json({
        ok: false,
        warning: 'study_events table is missing. Run supabase/migrations/20260602130000_study_events.sql in the Supabase SQL editor.',
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
