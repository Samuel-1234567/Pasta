import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { requireUser } from '@/app/lib/supabase/require-user'
import { getStripeClient } from '@/app/lib/stripe'
import { appBaseUrl, getSubscriptionForUser } from '@/app/lib/subscription'

export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const subscription = await getSubscriptionForUser(supabase, auth.user.id)

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Subscribe to Pro first.' },
        { status: 400 },
      )
    }

    const stripe = getStripeClient()
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appBaseUrl()}/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open billing portal.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
