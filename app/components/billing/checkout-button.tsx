'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/auth'

type CheckoutButtonProps = {
  children: React.ReactNode
  className?: string
  loginNext?: string
}

export function CheckoutButton({ children, className, loginNext = '/pricing' }: CheckoutButtonProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout() {
    setError(null)

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/billing/create-checkout-session', { method: 'POST' })
      const data = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !data.url) {
        setError(data.error ?? 'Could not start checkout.')
        return
      }

      window.location.href = data.url
    } catch {
      setError('Could not start checkout. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading || submitting}
        className={className}
      >
        {submitting ? 'Redirecting…' : children}
      </button>
      {error ? (
        <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  )
}
