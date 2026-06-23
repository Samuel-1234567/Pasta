import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { requireUser } from '@/app/lib/supabase/require-user'
import { syncCheckoutSessionById } from '@/app/lib/sync-stripe-subscription'
import { ensureSubscriptionRow } from '@/app/lib/subscription'

export const dynamic = 'force-dynamic'

import { mapSubscriptionRowToSummary } from '@/app/lib/billing-display'
export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  let sessionId: string | undefined
  try {
    const body = (await request.json()) as { sessionId?: string }
    sessionId = body.sessionId?.trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 })
  }

  try {
    const result = await syncCheckoutSessionById(sessionId, auth.user.id)

    if (result.pending) {
      return NextResponse.json(
        { synced: false, pending: true },
        { status: 202, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const supabase = createSupabaseAdminClient()
    const subscription = await ensureSubscriptionRow(supabase, auth.user.id)

    return NextResponse.json(
      {
        synced: true,
        subscription: mapSubscriptionRowToSummary(subscription),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync checkout session.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
