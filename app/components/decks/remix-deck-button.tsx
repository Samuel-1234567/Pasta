'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type RemixDeckButtonProps = {
  deckId: string
  className?: string
  onRemixed?: (deckId: string) => void
}

export function RemixDeckButton({ deckId, className, onRemixed }: RemixDeckButtonProps) {
  const router = useRouter()
  const [remixing, setRemixing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remix() {
    setRemixing(true)
    setError(null)

    try {
      const response = await fetch(`/api/decks/${encodeURIComponent(deckId)}/remix`, {
        method: 'POST',
      })
      const body = (await response.json().catch(() => null)) as {
        deckId?: string
        error?: string
      } | null

      if (!response.ok || !body?.deckId) {
        throw new Error(body?.error ?? `Could not remix deck (${response.status}).`)
      }

      onRemixed?.(body.deckId)
      router.push(`/decks/${body.deckId}/edit`)
    } catch (remixError) {
      setError(remixError instanceof Error ? remixError.message : 'Could not remix deck.')
    } finally {
      setRemixing(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void remix()}
        disabled={remixing}
        className={
          className ??
          'inline-flex rounded-full border border-stone-300 bg-white/60 px-3 py-1.5 text-xs font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white disabled:opacity-50 dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500'
        }
      >
        {remixing ? 'Remixing…' : 'Remix'}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}
