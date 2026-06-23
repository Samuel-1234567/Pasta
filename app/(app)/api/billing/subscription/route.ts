import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { mapSubscriptionRowToSummary } from '@/app/lib/billing-display'
import { requireUser } from '@/app/lib/supabase/require-user'
import { syncSubscriptionFromStripeForUser } from '@/app/lib/sync-stripe-subscription'
import { ensureSubscriptionRow } from '@/app/lib/subscription'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    await syncSubscriptionFromStripeForUser(auth.user.id)

    const supabase = createSupabaseAdminClient()
    const subscription = await ensureSubscriptionRow(supabase, auth.user.id)
    return NextResponse.json(
      { subscription: mapSubscriptionRowToSummary(subscription) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load subscription.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
