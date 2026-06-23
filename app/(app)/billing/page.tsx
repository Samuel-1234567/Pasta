'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { CheckoutButton } from '@/app/components/billing/checkout-button'
import { ManageSubscriptionButton } from '@/app/components/billing/manage-subscription-button'
import {
  formatPlanLabel,
  formatRenewalLabel,
  formatStatusLabel,
  type SubscriptionSummary,
} from '@/app/lib/billing-display'
import { useAuth } from '@/app/lib/auth'

async function fetchSubscription(): Promise<SubscriptionSummary> {
  const response = await fetch('/api/billing/subscription', { cache: 'no-store' })
  const data = (await response.json()) as {
    subscription?: SubscriptionSummary
    error?: string
  }

  if (!response.ok || !data.subscription) {
    throw new Error(data.error ?? 'Could not load subscription.')
  }

  return data.subscription
}

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadSubscription = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setLoading(false)
      return
    }

    if (options?.silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const nextSubscription = await fetchSubscription()
      setSubscription(nextSubscription)
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Could not load subscription.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) {
      return
    }

    void loadSubscription()
  }, [authLoading, loadSubscription])

  useEffect(() => {
    function refreshOnReturn() {
      if (document.visibilityState === 'visible') {
        void loadSubscription({ silent: true })
      }
    }

    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)

    return () => {
      window.removeEventListener('focus', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [loadSubscription])

  const renewalLabel = subscription ? formatRenewalLabel(subscription) : null
  const isPro = subscription?.plan === 'pro'

  return (
    <div className="min-h-full bg-stone-50 px-4 py-10 text-stone-900 dark:bg-stone-950 dark:text-stone-100 sm:px-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Billing &amp; payments
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          View your plan, upgrade to Pro, or manage your subscription and payment method.
        </p>

        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Current plan</h2>
            {refreshing ? (
              <span className="text-xs text-stone-500 dark:text-stone-400">Updating…</span>
            ) : null}
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Loading subscription…</p>
          ) : error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </p>
          ) : subscription ? (
            <>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
                    {formatPlanLabel(subscription.plan)}
                  </p>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                    {isPro ? '$4.99 per month' : 'No monthly charge'}
                  </p>
                </div>
                <span
                  className={[
                    'inline-flex rounded-full px-3 py-1 text-xs font-medium',
                    subscription.status === 'active' || subscription.status === 'trialing'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : subscription.status === 'past_due'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                        : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
                  ].join(' ')}
                >
                  {formatStatusLabel(subscription)}
                </span>
              </div>

              {renewalLabel ? (
                <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">{renewalLabel}</p>
              ) : null}

              {subscription.cancelAtPeriodEnd ? (
                <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">
                  Your Pro access continues until the end of your billing period. You can reactivate
                  anytime from Manage subscription.
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                {subscription.canManageBilling ? (
                  <ManageSubscriptionButton className="inline-flex rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500">
                    Manage subscription
                  </ManageSubscriptionButton>
                ) : null}

                {!isPro ? (
                  <CheckoutButton
                    loginNext="/billing"
                    className="inline-flex rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
                  >
                    Upgrade to Pro
                  </CheckoutButton>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Pro includes</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-400">
            <li>Larger deck limits</li>
            <li>Advanced deck privacy controls</li>
            <li>Priority generation and exports when available</li>
          </ul>
          <Link
            href="/pricing"
            className="mt-4 inline-flex text-sm font-medium text-amber-800 transition hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
          >
            Compare all plans
          </Link>
        </div>

        {subscription?.canManageBilling ? (
          <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">
            Use{' '}
            <span className="font-medium text-stone-700 dark:text-stone-300">Manage subscription</span>{' '}
            to update your payment method, view invoices, or change your plan.
          </p>
        ) : null}
      </div>
    </div>
  )
}
