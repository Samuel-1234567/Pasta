'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function DeckPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''

  return (
    <div className="min-h-full bg-stone-50 px-4 py-10 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="mx-auto max-w-lg">
        <Link href="/decks" className="text-sm font-medium text-stone-600 hover:underline dark:text-stone-400">
          ← Back to decks
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Deck</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Edit cards or jump into study mode.
        </p>
        {id ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/decks/${id}/edit`}
              className="inline-flex rounded-full bg-amber-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              Edit deck
            </Link>
            <Link
              href={`/decks/${id}/study`}
              className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              Study
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
