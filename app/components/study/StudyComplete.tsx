'use client'

import Link from 'next/link'
import { formatCardsReviewed, formatStudyDuration } from '@/app/lib/study-stats'

export type StudySessionStats = {
  totalSeconds: number
  avgSecondsPerCard: number
  cardCount: number
}

type StudyCompleteProps = {
  deckId: string
  deckName: string
  stats: StudySessionStats
  onStudyAgain?: () => void
  fromExplore?: boolean
}

export function StudyComplete({ deckId, deckName, stats, onStudyAgain, fromExplore = false }: StudyCompleteProps) {
  const statItems = [
    {
      label: 'Total time',
      value: formatStudyDuration(stats.totalSeconds),
      hint: 'this session',
    },
    {
      label: 'Avg. per card',
      value: formatStudyDuration(stats.avgSecondsPerCard),
      hint: 'time per card',
    },
    {
      label: 'Cards studied',
      value: formatCardsReviewed(stats.cardCount),
      hint: 'in this deck',
    },
  ]

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-950/50">
        ✓
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
        Session complete
      </h1>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        Nice work studying {deckName ? `"${deckName}"` : 'this deck'}.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {statItems.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900/40"
          >
            <div className="text-xs font-medium text-stone-600 dark:text-stone-400">{stat.label}</div>
            <div className="mt-2 text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              {stat.value}
            </div>
            <div className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">{stat.hint}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {onStudyAgain ? (
          <button
            type="button"
            onClick={onStudyAgain}
            className="inline-flex rounded-full bg-amber-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Study again
          </button>
        ) : (
          <Link
            href={`/decks/${deckId}/study`}
            className="inline-flex rounded-full bg-amber-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Study again
          </Link>
        )}
        <Link
          href={`/decks/${deckId}`}
          className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          Back to deck
        </Link>
        <Link
          href={fromExplore ? '/explore' : '/decks'}
          className="inline-flex rounded-full px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        >
          {fromExplore ? 'Back to explore' : 'All decks'}
        </Link>
      </div>
    </div>
  )
}
