'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DeckComments } from '@/app/components/decks/deck-comments'
import { DeckOriginPill } from '@/app/components/decks/deck-origin-pill'
import { RemixDeckButton } from '@/app/components/decks/remix-deck-button'
import { useCurrentUserId } from '@/app/lib/auth'
import { deckOrigin } from '@/app/lib/deck-origin'

type DeckDetails = {
  name: string
  canEdit: boolean
  isPublic: boolean
  origin: ReturnType<typeof deckOrigin>
}

export default function DeckPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  const userId = useCurrentUserId()
  const [deck, setDeck] = useState<DeckDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !userId) {
      if (!id) setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const response = await fetch(`/api/decks/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`)
        const body = (await response.json().catch(() => null)) as {
          error?: string
          deck?: { name: string; is_public?: boolean; remixed_from_deck_id?: string | null }
          canEdit?: boolean
        } | null

        if (!response.ok) {
          throw new Error(body?.error ?? `Failed to load deck (${response.status}).`)
        }
        if (cancelled) return

        setDeck({
          name: body?.deck?.name ?? 'Deck',
          canEdit: Boolean(body?.canEdit),
          isPublic: Boolean(body?.deck?.is_public),
          origin: deckOrigin({
            name: body?.deck?.name,
            remixed_from_deck_id: body?.deck?.remixed_from_deck_id,
          }),
        })
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Something went wrong.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id, userId])

  const backHref = deck?.canEdit ? '/decks' : '/explore'
  const backLabel = deck?.canEdit ? 'Back to decks' : 'Back to explore'
  const studyHref = deck?.canEdit ? `/decks/${id}/study` : `/decks/${id}/study?from=explore`

  return (
    <div className="min-h-full bg-stone-50 px-4 py-10 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="mx-auto max-w-2xl">
        <Link href={backHref} className="text-sm font-medium text-stone-600 hover:underline dark:text-stone-400">
          ← {backLabel}
        </Link>

        {loading ? (
          <p className="mt-6 text-sm text-stone-600 dark:text-stone-400">Loading deck…</p>
        ) : error ? (
          <>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">Deck unavailable</h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{error}</p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">{deck?.name ?? 'Deck'}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {deck?.canEdit ? <DeckOriginPill origin={deck.origin} /> : deck?.origin === 'remix' ? (
                <DeckOriginPill origin="remix" />
              ) : null}
              {deck?.isPublic ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  Public
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              {deck?.canEdit
                ? deck?.isPublic
                  ? 'Edit cards, study, or read comments from other learners.'
                  : 'Edit cards or jump into study mode.'
                : 'Study this deck or remix it into your own library.'}
            </p>
            {id ? (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {deck?.canEdit ? (
                  <Link
                    href={`/decks/${id}/edit`}
                    className="inline-flex rounded-full bg-amber-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                  >
                    Edit deck
                  </Link>
                ) : (
                  <RemixDeckButton
                    deckId={id}
                    className="inline-flex rounded-full bg-amber-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
                  />
                )}
                <Link
                  href={studyHref}
                  className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
                >
                  Study
                </Link>
              </div>
            ) : null}
            {deck?.isPublic && id ? <DeckComments deckId={id} /> : null}
          </>
        )}
      </div>
    </div>
  )
}
