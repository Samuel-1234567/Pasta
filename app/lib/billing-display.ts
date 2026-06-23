export type SubscriptionSummary = {
  plan: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodEnd: string | null
  canManageBilling: boolean
  cancelAtPeriodEnd: boolean
}

export function mapSubscriptionRowToSummary(row: {
  plan: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
}): SubscriptionSummary {
  const cancelAtPeriodEnd =
    row.plan === 'pro' && row.status === 'canceled' && Boolean(row.stripe_subscription_id)

  return {
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    canManageBilling: Boolean(row.stripe_customer_id && row.stripe_subscription_id),
    cancelAtPeriodEnd,
  }
}

export function formatPlanLabel(plan: SubscriptionSummary['plan']) {
  return plan === 'pro' ? 'Pro' : 'Free'
}

export function hasProAccess(
  subscription: Pick<SubscriptionSummary, 'plan' | 'status'> | null | undefined,
) {
  if (!subscription || subscription.plan !== 'pro') return false
  return (
    subscription.status === 'active' ||
    subscription.status === 'trialing' ||
    subscription.status === 'past_due'
  )
}

export function formatStatusLabel(subscription: SubscriptionSummary) {
  switch (subscription.status) {
    case 'active':
      return 'Active'
    case 'trialing':
      return 'Trialing'
    case 'past_due':
      return 'Past due'
    case 'canceled':
      return 'Canceled'
  }
}

export function formatRenewalLabel(subscription: SubscriptionSummary) {
  if (!subscription.currentPeriodEnd) {
    return null
  }

  const date = new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (subscription.cancelAtPeriodEnd) {
    return `Cancels on ${date}`
  }

  if (subscription.status === 'canceled') {
    return `Access until ${date}`
  }

  return `Renews ${date}`
}
