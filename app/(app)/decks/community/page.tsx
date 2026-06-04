'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCurrentUserId } from '@/app/lib/auth'

type CommunityDeck = {
  id: string
  name: string
  cards: number
  authorLabel: string
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
      <div className="h-4 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
      <div className="mt-2 h-3 w-1/2 rounded bg-stone-200 dark:bg-stone-800" />
      <div className="mt-4 h-8 w-24 rounded-full bg-stone-200 dark:bg-stone-800" />
    </div>
  )
}

async function fetchCommunityDecks(userId: string, signal?: AbortSignal): Promise<CommunityDeck[]> {
  const res = await fetch(`/api/decks/community?userId=${encodeURIComponent(userId)}`, { signal })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Failed to load community decks (${res.status}).`)
  }

  const body = (await res.json()) as {
    decks: Array<{
      id: string
      name: string
      author_label: string
      cards: number
    }>
  }

  return (body.decks ?? []).map((deck) => ({
    id: deck.id,
    name: deck.name,
    cards: deck.cards ?? 0,
    authorLabel: deck.author_label,
  }))
}

export default function CommunityDecksPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decks, setDecks] = useState<CommunityDeck[]>([])
  const activeLoadIdRef = useRef(0)

  const sortedDecks = useMemo(() => [...decks].sort((a, b) => a.name.localeCompare(b.name)), [decks])

  const load = useCallback(async (signal?: AbortSignal) => {
    const loadId = ++activeLoadIdRef.current
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchCommunityDecks(getCurrentUserId(), signal)
      if (activeLoadIdRef.current === loadId) setDecks(result)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (activeLoadIdRef.current === loadId) {
        setError(e instanceof Error ? e.message : 'Something went wrong.')
      }
    } finally {
      if (activeLoadIdRef.current === loadId) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  return (
    <div className="min-h-full bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-b from-amber-50/80 via-stone-50 to-stone-50 dark:border-stone-800 dark:from-amber-950/30 dark:via-stone-950 dark:to-stone-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, rgb(180 83 9 / 0.16), transparent 45%),
              radial-gradient(circle at 85% 15%, rgb(120 53 15 / 0.12), transparent 42%),
              radial-gradient(circle at 50% 100%, rgb(87 83 78 / 0.08), transparent 55%)`,
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-3 inline-flex rounded-full border border-amber-200/80 bg-amber-100/50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                Community
              </p>
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl">
                Decks from others
              </h1>
              <p className="mt-4 max-w-xl text-sm text-stone-600 dark:text-stone-400">
                Public decks shared by other Pasta users. Study them or use them as inspiration for your own library.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex rounded-full border border-stone-300 bg-white/70 px-4 py-2.5 text-sm font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => void load()}
                disabled={isLoading}
                className="inline-flex rounded-full border border-stone-300 bg-white/70 px-4 py-2.5 text-sm font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {error ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Couldn&apos;t load community decks</h2>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-5 inline-flex rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : sortedDecks.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">No public decks yet</h2>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              When other users mark decks as public, they&apos;ll show up here.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-full border border-stone-300 bg-white/60 px-4 py-2 text-sm font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedDecks.map((deck) => (
              <div
                key={deck.id}
                className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900/40"
              >
                <div className="min-w-0">
                  <Link
                    href={`/decks/${deck.id}`}
                    className="block truncate text-base font-semibold text-stone-900 hover:underline dark:text-stone-50"
                  >
                    {deck.name}
                  </Link>
                  <div className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                    {deck.cards} cards • by {deck.authorLabel}
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/decks/${deck.id}/study`}
                    className="inline-flex rounded-full border border-stone-300 bg-white/60 px-3 py-1.5 text-xs font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
                  >
                    Study
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
