'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUserId } from '@/app/lib/auth'
import { formatTimeFromNow } from '@/app/lib/format-time-from-now'
import {
  formatCardsReviewed,
  formatStreakDays,
  formatStudyMinutes,
  streakHint,
  type StudyStats,
} from '@/app/lib/study-stats'

const RECENT_DECK_LIMIT = 5

type DeckVisibility = 'Private' | 'Public'

type RecentDeck = {
  id: string
  name: string
  cards: number
  visibility: DeckVisibility
  lastEditedAt: string | null
}

function VisibilityPill({ value }: { value: DeckVisibility }) {
  const styles =
    value === 'Public'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
      : 'border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-900/30 dark:text-stone-200'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}>
      {value}
    </span>
  )
}

function timestampMs(iso: string | null): number {
  if (!iso) return 0
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? 0 : ms
}

async function fetchStudyStats(userId: string, signal?: AbortSignal): Promise<StudyStats> {
  const res = await fetch(`/api/study-stats?userId=${encodeURIComponent(userId)}`, { signal })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Failed to load stats (${res.status}).`)
  }
  return (await res.json()) as StudyStats
}

async function fetchRecentDecks(userId: string, signal?: AbortSignal): Promise<RecentDeck[]> {
  const res = await fetch(`/api/decks?userId=${encodeURIComponent(userId)}`, { signal })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Failed to load decks (${res.status}).`)
  }

  const body = (await res.json()) as {
    decks: Array<{
      id: string
      name: string
      is_public: boolean
      cards: number
      last_edited_at: string | null
    }>
  }

  return (body.decks ?? [])
    .map((deck) => ({
      id: deck.id,
      name: deck.name,
      cards: deck.cards ?? 0,
      visibility: deck.is_public ? 'Public' : 'Private',
      lastEditedAt: deck.last_edited_at,
    }))
    .sort((a, b) => timestampMs(b.lastEditedAt) - timestampMs(a.lastEditedAt))
    .slice(0, RECENT_DECK_LIMIT)
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
      <div className="h-4 w-24 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
      <div className="mt-3 h-9 w-20 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
      <div className="mt-2 h-3 w-16 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
    </div>
  )
}

function RecentDeckSkeleton() {
  return (
    <div className="flex flex-col gap-2 bg-stone-50/60 p-4 dark:bg-stone-950/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="h-4 w-2/3 max-w-xs animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="mt-2 h-3 w-40 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
      </div>
      <div className="h-7 w-16 animate-pulse rounded-full bg-stone-200 dark:bg-stone-800" />
    </div>
  )
}

export default function DashboardPage() {
  const [recentDecks, setRecentDecks] = useState<RecentDeck[]>([])
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setError(null)
    try {
      const userId = getCurrentUserId()
      const [decks, stats] = await Promise.all([
        fetchRecentDecks(userId, signal),
        fetchStudyStats(userId, signal),
      ])
      setRecentDecks(decks)
      setStudyStats(stats)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Could not load dashboard.')
      setRecentDecks([])
      setStudyStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const recentSection = useMemo(() => {
    if (isLoading) {
      return (
        <>
          <RecentDeckSkeleton />
          <RecentDeckSkeleton />
          <RecentDeckSkeleton />
        </>
      )
    }

    if (error) {
      return (
        <div className="p-6 text-center">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 inline-flex rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Try again
          </button>
        </div>
      )
    }

    if (recentDecks.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="text-sm text-stone-600 dark:text-stone-400">No decks yet. Create one to get started.</p>
          <Link
            href="/decks/new"
            className="mt-4 inline-flex rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Create deck
          </Link>
        </div>
      )
    }

    return recentDecks.map((deck) => (
      <Link
        key={deck.id}
        href={`/decks/${deck.id}`}
        className="flex flex-col gap-2 bg-stone-50/60 p-4 transition hover:bg-stone-100 dark:bg-stone-950/20 dark:hover:bg-stone-950/40 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <div className="truncate font-medium text-stone-900 dark:text-stone-50">{deck.name}</div>
          <div className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            {deck.cards} {deck.cards === 1 ? 'card' : 'cards'} • edited {formatTimeFromNow(deck.lastEditedAt, now)}
          </div>
        </div>
        <div className="shrink-0">
          <VisibilityPill value={deck.visibility} />
        </div>
      </Link>
    ))
  }, [error, isLoading, load, now, recentDecks])

  const statCards = useMemo(() => {
    const stats = studyStats ?? {
      studyMinutesToday: 0,
      cardsReviewedToday: 0,
      streakDays: 0,
    }
    return [
      {
        label: 'Study time',
        value: formatStudyMinutes(stats.studyMinutesToday),
        hint: 'today',
      },
      {
        label: 'Cards reviewed',
        value: formatCardsReviewed(stats.cardsReviewedToday),
        hint: 'today',
      },
      {
        label: 'Streak',
        value: formatStreakDays(stats.streakDays),
        hint: streakHint(stats.streakDays),
      },
    ]
  }, [studyStats])

  return (
    <div className="min-h-full bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Welcome back
            </h1>
            <p className="mt-2 max-w-2xl text-stone-600 dark:text-stone-400">
              Pick up where you left off, or start a new deck.
            </p>
          </div>
          <Link
            href="/decks/new"
            className="inline-flex shrink-0 rounded-full bg-amber-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Create deck
          </Link>
        </div>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          {isLoading
            ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            )
            : statCards.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40"
              >
                <div className="text-sm font-medium text-stone-600 dark:text-stone-400">{stat.label}</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                  {stat.value}
                </div>
                <div className="mt-2 text-xs text-stone-500 dark:text-stone-400">{stat.hint}</div>
              </div>
            ))}
        </section>

        <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Recent decks</h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                Your most recently edited decks.
              </p>
            </div>
            <Link
              href="/decks"
              className="inline-flex rounded-full border border-stone-300 bg-white/60 px-4 py-2 text-sm font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
            >
              View all
            </Link>
          </div>

          <div className="mt-6 divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
            {recentSection}
          </div>
        </section>

        <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Explore community decks</h2>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Browse public decks made by other users and jump into study mode.
            </p>
            <Link
              href="/decks/community"
              className="mt-5 inline-flex rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              View community decks
            </Link>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-amber-900 via-amber-800 to-stone-900 p-6 text-amber-50 shadow-sm dark:border-stone-800 dark:from-stone-900 dark:via-amber-950 dark:to-stone-950">
            <h2 className="text-lg font-semibold">Create a deck</h2>
            <p className="mt-2 text-sm text-amber-100/90">
              Keep decks scoped and named clearly. Your future self will thank you.
            </p>
            <Link
              href="/decks/new"
              className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-amber-900 shadow transition hover:bg-amber-50"
            >
              Start a new deck
            </Link>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Upgrade when ready</h2>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Need bigger limits or better sharing controls? Compare plans anytime.
            </p>
            <Link
              href="/pricing"
              className="mt-5 inline-flex rounded-full border border-stone-300 bg-white/60 px-4 py-2 text-sm font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
            >
              See pricing
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
