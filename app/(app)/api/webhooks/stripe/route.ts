import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripeClient } from '@/app/lib/stripe'
import {
  syncCheckoutSession,
  syncSubscriptionDeleted,
  syncSubscriptionUpdated,
} from '@/app/lib/sync-stripe-subscription'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET.' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }

  const body = await request.text()

  let event: Stripe.Event
  try {
    const stripe = getStripeClient()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook signature.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await syncCheckoutSession(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await syncSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await syncSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      default:
        break
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler failed.'
    console.error('[stripe webhook]', event.type, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true, type: event.type })
}
