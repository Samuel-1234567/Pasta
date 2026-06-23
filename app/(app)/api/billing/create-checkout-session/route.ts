import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { requireUser } from '@/app/lib/supabase/require-user'
import { getStripeClient, STRIPE_MANAGED_PAYMENTS_API_VERSION } from '@/app/lib/stripe'
import { appBaseUrl, ensureStripeCustomer } from '@/app/lib/subscription'

export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          'Missing STRIPE_SUBSCRIPTION_PRICE_ID. Run npm run stripe:create-product and add the price ID to .env.local.',
      },
      { status: 500 },
    )
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { customerId } = await ensureStripeCustomer(supabase, auth.user)
    const stripe = getStripeClient()
    const baseUrl = appBaseUrl()

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        client_reference_id: auth.user.id,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/billing/cancel`,
        metadata: {
          user_id: auth.user.id,
        },
        subscription_data: {
          metadata: {
            user_id: auth.user.id,
          },
        },
        managed_payments: {
          enabled: true,
        },
      },
      {
        apiVersion: STRIPE_MANAGED_PAYMENTS_API_VERSION,
      },
    )

    if (!session.url) {
      return NextResponse.json({ error: 'Checkout session URL was not returned.' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
