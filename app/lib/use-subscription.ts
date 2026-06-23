'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { type SubscriptionSummary } from '@/app/lib/billing-display'
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

export function useSubscription() {
  const { user, loading: authLoading } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedForUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    setSubscription(null)
    setError(null)
    setLoading(true)
    loadedForUserIdRef.current = null
  }, [user?.id])

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      loadedForUserIdRef.current = null
      return
    }

    const isInitialLoad = loadedForUserIdRef.current !== user.id
    if (isInitialLoad) {
      setLoading(true)
    }
    setError(null)

    try {
      const nextSubscription = await fetchSubscription()
      setSubscription(nextSubscription)
      loadedForUserIdRef.current = user.id
    } catch (loadError) {
      setSubscription(null)
      loadedForUserIdRef.current = null
      setError(loadError instanceof Error ? loadError.message : 'Could not load subscription.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    void refresh()
  }, [authLoading, refresh])

  return { subscription, loading: authLoading || loading, error, refresh }
}
