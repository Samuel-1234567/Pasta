'use client'

import { useState } from 'react'

type ManageSubscriptionButtonProps = {
  children: React.ReactNode
  className?: string
}

export function ManageSubscriptionButton({ children, className }: ManageSubscriptionButtonProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openPortal() {
    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch('/api/billing/customer-portal', { method: 'POST' })
      const data = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !data.url) {
        setError(data.error ?? 'Could not open billing portal.')
        return
      }

      window.location.href = data.url
    } catch {
      setError('Could not open billing portal. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={openPortal} disabled={submitting} className={className}>
        {submitting ? 'Opening…' : children}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}
