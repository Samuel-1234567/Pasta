'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { SubscriptionSummary } from '@/app/lib/billing-display'

type SyncState = 'idle' | 'syncing' | 'synced' | 'pending' | 'error'

const MAX_ATTEMPTS = 8
const RETRY_DELAY_MS = 750

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function BillingSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [syncState, setSyncState] = useState<SyncState>(sessionId ? 'syncing' : 'idle')
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      return
    }

    let cancelled = false

    async function completeCheckout() {
      setSyncState('syncing')
      setError(null)

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        if (cancelled) {
          return
        }

        try {
          const response = await fetch('/api/billing/complete-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          })

          const data = (await response.json()) as {
            synced?: boolean
            pending?: boolean
            subscription?: SubscriptionSummary
            error?: string
          }

          if (response.status === 202 || data.pending) {
            if (attempt < MAX_ATTEMPTS - 1) {
              await sleep(RETRY_DELAY_MS)
              continue
            }

            if (!cancelled) {
              setSyncState('pending')
            }
            return
          }

          if (!response.ok) {
            throw new Error(data.error ?? 'Could not confirm your subscription.')
          }

          if (!cancelled) {
            setSubscription(data.subscription ?? null)
            setSyncState('synced')
          }
          return
        } catch (syncError) {
          if (attempt < MAX_ATTEMPTS - 1) {
            await sleep(RETRY_DELAY_MS)
            continue
          }

          if (!cancelled) {
            setError(
              syncError instanceof Error
                ? syncError.message
                : 'Could not confirm your subscription.',
            )
            setSyncState('error')
          }
        }
      }
    }

    void completeCheckout()

    return () => {
      cancelled = true
    }
  }, [sessionId])

  const isPro = subscription?.plan === 'pro' || syncState === 'synced'

  return (
    <div className="min-h-full bg-stone-50 px-4 py-16 text-stone-900 dark:bg-stone-950 dark:text-stone-100 sm:px-6">
      <div className="mx-auto max-w-lg text-center">
        {syncState === 'syncing' ? (
          <>
            <p className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              Confirming payment
            </p>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Activating Pro…
            </h1>
            <p className="mt-4 text-stone-600 dark:text-stone-400">
              Your payment went through. We are updating your account now.
            </p>
          </>
        ) : syncState === 'error' ? (
          <>
            <p className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              Confirmation delayed
            </p>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Payment received
            </h1>
            <p className="mt-4 text-stone-600 dark:text-stone-400">
              {error ?? 'We could not confirm your upgrade immediately.'} Check billing in a moment or refresh the page.
            </p>
          </>
        ) : syncState === 'pending' ? (
          <>
            <p className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              Almost there
            </p>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Finishing your upgrade
            </h1>
            <p className="mt-4 text-stone-600 dark:text-stone-400">
              Stripe is still finalizing checkout. Open billing to refresh your plan status.
            </p>
          </>
        ) : (
          <>
            <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
              {isPro ? 'Pro active' : 'Payment received'}
            </p>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Welcome to Pro
            </h1>
            <p className="mt-4 text-stone-600 dark:text-stone-400">
              {isPro
                ? 'Your subscription is active and ready to use.'
                : 'Your payment was successful.'}
            </p>
          </>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex rounded-full bg-amber-700 px-6 py-3 text-sm font-medium text-white shadow transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Go to dashboard
          </Link>
          <Link
            href="/billing"
            className="inline-flex rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-800 transition hover:border-stone-400 dark:border-stone-600 dark:text-stone-100"
          >
            View billing
          </Link>
        </div>
      </div>
    </div>
  )
}
