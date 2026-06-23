'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RemixDeckButton } from '@/app/components/decks/remix-deck-button'
import { DeckOriginPill } from '@/app/components/decks/deck-origin-pill'
import { Field, Label } from '@/app/components/ui/fieldset'
import { Input } from '@/app/components/ui/input'

type CommunityDeck = {
  id: string
  name: string
  cards: number
  authorLabel: string
  isOwn: boolean
  isRemix: boolean
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

async function fetchCommunityDecks(signal?: AbortSignal): Promise<CommunityDeck[]> {
  const res = await fetch('/api/decks/community', { signal })
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
      is_own?: boolean
      is_remix?: boolean
    }>
  }

  return (body.decks ?? []).map((deck) => ({
    id: deck.id,
    name: deck.name,
    cards: deck.cards ?? 0,
    authorLabel: deck.author_label,
    isOwn: Boolean(deck.is_own),
    isRemix: Boolean(deck.is_remix),
  }))
}

function SearchEmptyState({
  deckQuery,
  creatorQuery,
  onClear,
}: {
  deckQuery: string
  creatorQuery: string
  onClear: () => void
}) {
  const filters = [
    deckQuery ? `deck name “${deckQuery}”` : null,
    creatorQuery ? `creator “${creatorQuery}”` : null,
  ].filter(Boolean)

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">No decks match your filters</h2>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        Nothing found for {filters.join(' and ')}. Try different search terms.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-flex rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
      >
        Clear filters
      </button>
    </div>
  )
}

function ExploreEmptyState({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 15% 30%, rgb(217 119 6 / 0.18), transparent 45%),
              radial-gradient(circle at 80% 20%, rgb(120 53 15 / 0.12), transparent 42%),
              radial-gradient(circle at 30% 90%, rgb(87 83 78 / 0.10), transparent 55%)`,
          }}
        />

        <div className="relative">
          <p className="inline-flex rounded-full border border-stone-200 bg-stone-100/80 px-3 py-1 text-xs font-medium uppercase tracking-wide text-stone-600 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300">
            Nothing to explore yet
          </p>
          <h2 className="mt-4 text-lg font-semibold text-stone-900 dark:text-stone-50">
            No public decks from other learners
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            Explore shows decks that other Pasta users have marked as public. The library is quiet for now —
            check back soon as more people share their work.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-stone-600 dark:text-stone-400">
            <li className="flex gap-2">
              <span className="mt-0.5 text-amber-700 dark:text-amber-400" aria-hidden>
                •
              </span>
              <span>Only decks from other accounts appear here — yours won&apos;t show up in your own Explore feed.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-amber-700 dark:text-amber-400" aria-hidden>
                •
              </span>
              <span>When someone shares a public deck, you can study it or remix it into your library.</span>
            </li>
          </ul>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden>
            <div className="h-16 rounded-xl border border-dashed border-stone-200 bg-stone-100/50 dark:border-stone-700 dark:bg-stone-800/40" />
            <div className="h-16 rounded-xl border border-dashed border-stone-200 bg-stone-100/40 dark:border-stone-700 dark:bg-stone-800/30" />
            <div className="h-16 rounded-xl border border-dashed border-stone-200 bg-stone-100/30 dark:border-stone-700 dark:bg-stone-800/25" />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="mt-6 inline-flex rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-sm font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
          >
            {refreshing ? 'Checking…' : 'Check again'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-amber-900 via-amber-800 to-stone-900 p-6 text-amber-50 shadow-sm dark:border-stone-800 dark:from-stone-900 dark:via-amber-950 dark:to-stone-950">
          <h3 className="text-lg font-semibold">Share a deck publicly</h3>
          <p className="mt-2 text-sm text-amber-100/90">
            Have something worth sharing? Open one of your decks and toggle &ldquo;Public deck&rdquo; so others can
            find and study it.
          </p>
          <Link
            href="/decks"
            className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-amber-900 shadow transition hover:bg-amber-50"
          >
            Go to your decks
          </Link>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
          <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">Build while you wait</h3>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Start a deck of your own so you&apos;re ready to study — or share — when the community grows.
          </p>
          <Link
            href="/decks/new"
            className="mt-4 inline-flex rounded-full border border-stone-300 bg-white/60 px-4 py-2 text-sm font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
          >
            Create a deck
          </Link>
        </div>
      </div>
    </div>
  )
}

export function ExploreContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decks, setDecks] = useState<CommunityDeck[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [creatorQuery, setCreatorQuery] = useState('')
  const activeLoadIdRef = useRef(0)

  const sortedDecks = useMemo(() => [...decks].sort((a, b) => a.name.localeCompare(b.name)), [decks])

  const filteredDecks = useMemo(() => {
    const deckTerm = searchQuery.trim().toLowerCase()
    const creatorTerm = creatorQuery.trim().toLowerCase()

    return sortedDecks.filter((deck) => {
      if (deckTerm && !deck.name.toLowerCase().includes(deckTerm)) return false
      if (creatorTerm && !deck.authorLabel.toLowerCase().includes(creatorTerm)) return false
      return true
    })
  }, [creatorQuery, searchQuery, sortedDecks])

  const hasActiveFilters = searchQuery.trim() !== '' || creatorQuery.trim() !== ''

  function clearFilters() {
    setSearchQuery('')
    setCreatorQuery('')
  }

  const load = useCallback(async (signal?: AbortSignal) => {
    const loadId = ++activeLoadIdRef.current
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchCommunityDecks(signal)
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
                Explore
              </p>
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl">
                Decks from others
              </h1>
              <p className="mt-4 max-w-xl text-sm text-stone-600 dark:text-stone-400">
                Public decks shared by other Pasta users. Study them or use them as inspiration for your own library.
              </p>
            </div>

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
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {error ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Couldn&apos;t load decks</h2>
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
          <ExploreEmptyState onRefresh={() => void load()} refreshing={isLoading} />
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap">
                <Field className="min-w-0 flex-1 sm:min-w-[12rem]">
                  <Label>Deck name</Label>
                  <Input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by deck name"
                  />
                </Field>
                <Field className="min-w-0 flex-1 sm:min-w-[12rem]">
                  <Label>Creator</Label>
                  <Input
                    type="search"
                    value={creatorQuery}
                    onChange={(e) => setCreatorQuery(e.target.value)}
                    placeholder="Search by creator name"
                  />
                </Field>
              </div>
              {hasActiveFilters ? (
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Showing {filteredDecks.length} of {sortedDecks.length} decks
                </p>
              ) : null}
            </div>

            {filteredDecks.length === 0 ? (
              <SearchEmptyState
                deckQuery={searchQuery.trim()}
                creatorQuery={creatorQuery.trim()}
                onClear={clearFilters}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDecks.map((deck) => (
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
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {deck.isOwn ? <DeckOriginPill origin="yours" /> : null}
                        {deck.isRemix ? <DeckOriginPill origin="remix" /> : null}
                      </div>
                      <div className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                        {deck.cards} cards • by {deck.authorLabel}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/decks/${deck.id}/study?from=explore`}
                        className="inline-flex rounded-full border border-stone-300 bg-white/60 px-3 py-1.5 text-xs font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
                      >
                        Study
                      </Link>
                      <RemixDeckButton deckId={deck.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
