import 'server-only'

import type Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { getStripeClient } from '@/app/lib/stripe'
import type { SubscriptionPlan, SubscriptionStatus } from '@/app/lib/subscription'
import { ensureSubscriptionRow, getSubscriptionForUser } from '@/app/lib/subscription'

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
  }

  return 'canceled'
}

function getStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!customer) {
    return null
  }

  return typeof customer === 'string' ? customer : customer.id
}

function isSubscriptionPendingCancellation(stripeSubscription: Stripe.Subscription): boolean {
  if (stripeSubscription.status !== 'active' && stripeSubscription.status !== 'trialing') {
    return false
  }

  return (
    stripeSubscription.cancel_at_period_end ||
    stripeSubscription.cancel_at != null ||
    stripeSubscription.canceled_at != null
  )
}

function getSubscriptionPeriodEnd(stripeSubscription: Stripe.Subscription): string | null {
  const periodEnd =
    stripeSubscription.cancel_at ?? stripeSubscription.items.data[0]?.current_period_end
  if (!periodEnd) {
    return null
  }

  return new Date(periodEnd * 1000).toISOString()
}

function mapSubscriptionState(stripeSubscription: Stripe.Subscription): {
  plan: SubscriptionPlan
  status: SubscriptionStatus
} {
  const isActivePlan =
    stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing'

  if (!isActivePlan) {
    return {
      plan: 'free',
      status: mapStripeSubscriptionStatus(stripeSubscription.status),
    }
  }

  if (isSubscriptionPendingCancellation(stripeSubscription)) {
    return { plan: 'pro', status: 'canceled' }
  }

  return {
    plan: 'pro',
    status: mapStripeSubscriptionStatus(stripeSubscription.status),
  }
}

async function resolveUserIdByStripeCustomerId(customerId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data?.user_id ?? null
}

async function resolveUserIdForStripeSubscription(
  stripeSubscription: Stripe.Subscription,
): Promise<string | null> {
  if (stripeSubscription.metadata?.user_id) {
    return stripeSubscription.metadata.user_id
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', stripeSubscription.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (data?.user_id) {
    return data.user_id
  }

  const customerId = getStripeCustomerId(stripeSubscription.customer)
  if (customerId) {
    return resolveUserIdByStripeCustomerId(customerId)
  }

  return null
}

async function resolveUserIdForCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const directUserId = session.metadata?.user_id ?? session.client_reference_id
  if (directUserId) {
    return directUserId
  }

  const customerId = getStripeCustomerId(session.customer)
  if (customerId) {
    return resolveUserIdByStripeCustomerId(customerId)
  }

  return null
}

export async function syncSubscriptionFromStripe(
  userId: string,
  stripeSubscription: Stripe.Subscription,
  stripeCustomerId: string | null,
) {
  const supabase = createSupabaseAdminClient()
  await ensureSubscriptionRow(supabase, userId)

  const { plan, status } = mapSubscriptionState(stripeSubscription)

  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscription.id,
      plan,
      status,
      current_period_end: getSubscriptionPeriodEnd(stripeSubscription),
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function syncCheckoutSession(session: Stripe.Checkout.Session) {
  const stripe = getStripeClient()
  const fullSession =
    session.metadata?.user_id || session.client_reference_id
      ? session
      : await stripe.checkout.sessions.retrieve(session.id)

  const userId = await resolveUserIdForCheckoutSession(fullSession)
  if (!userId) {
    throw new Error('Checkout session is not linked to a profile.')
  }

  const subscriptionId =
    typeof fullSession.subscription === 'string'
      ? fullSession.subscription
      : fullSession.subscription?.id

  if (!subscriptionId) {
    throw new Error('Checkout session is missing subscription id.')
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
  const customerId = getStripeCustomerId(fullSession.customer)

  await syncSubscriptionFromStripe(userId, stripeSubscription, customerId)
}

export async function syncCheckoutSessionById(sessionId: string, expectedUserId: string) {
  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  const userId = await resolveUserIdForCheckoutSession(session)
  if (!userId || userId !== expectedUserId) {
    throw new Error('Checkout session does not belong to this account.')
  }

  if (session.status !== 'complete') {
    return { synced: false as const, pending: true as const, session }
  }

  await syncCheckoutSession(session)
  return { synced: true as const, pending: false as const, session }
}

export async function syncSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const stripe = getStripeClient()
  const fullSubscription = await stripe.subscriptions.retrieve(stripeSubscription.id)

  const userId = await resolveUserIdForStripeSubscription(fullSubscription)
  if (!userId) {
    throw new Error(`No profile found for subscription ${fullSubscription.id}.`)
  }

  const customerId = getStripeCustomerId(fullSubscription.customer)
  await syncSubscriptionFromStripe(userId, fullSubscription, customerId)
}

export async function syncSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const userId = await resolveUserIdForStripeSubscription(stripeSubscription)
  if (!userId) {
    throw new Error(`No profile found for deleted subscription ${stripeSubscription.id}.`)
  }

  await markSubscriptionEnded(userId)
}

async function markSubscriptionEnded(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      current_period_end: null,
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function syncSubscriptionFromStripeForUser(userId: string) {
  const supabase = createSupabaseAdminClient()
  const row = await getSubscriptionForUser(supabase, userId)

  if (!row?.stripe_subscription_id) {
    return
  }

  const stripe = getStripeClient()

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(row.stripe_subscription_id)
    await syncSubscriptionFromStripe(userId, stripeSubscription, row.stripe_customer_id)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'resource_missing'
    ) {
      await markSubscriptionEnded(userId)
      return
    }

    throw error
  }
}
