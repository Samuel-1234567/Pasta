import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { getStripeClient } from '@/app/lib/stripe'

export type SubscriptionPlan = 'free' | 'pro'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'

export type SubscriptionRow = {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: SubscriptionPlan
  status: SubscriptionStatus
  current_period_end: string | null
}

export function mapSubscriptionRow(row: SubscriptionRow) {
  return {
    plan: row.plan,
    status: row.status,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    currentPeriodEnd: row.current_period_end,
  }
}

export async function getSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as SubscriptionRow | null
}

export async function ensureSubscriptionRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionRow> {
  const existing = await getSubscriptionForUser(supabase, userId)
  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan: 'free',
      status: 'active',
    })
    .select(
      'id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end',
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as SubscriptionRow
}

export async function ensureStripeCustomer(
  supabase: SupabaseClient,
  user: User,
): Promise<{ subscription: SubscriptionRow; customerId: string }> {
  const subscription = await ensureSubscriptionRow(supabase, user.id)

  if (subscription.stripe_customer_id) {
    return { subscription, customerId: subscription.stripe_customer_id }
  }

  const stripe = getStripeClient()
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: {
      user_id: user.id,
    },
  })

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ stripe_customer_id: customer.id })
    .eq('user_id', user.id)
    .select(
      'id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end',
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return { subscription: data as SubscriptionRow, customerId: customer.id }
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'http://localhost:3000'
  )
}
