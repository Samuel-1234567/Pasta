'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FlipCard } from '@/app/components/study/FlipCard'
import { CardFaceContent } from '@/app/lib/card-face'
import { getCurrentUserId } from '@/app/lib/auth'
import { recordStudyActivity } from '@/app/lib/record-study-activity'

const SESSION_TICK_SECONDS = 30

type StudyCard = {
  id: string
  front: string
  back: string
  position: number
}

export default function StudyDeckPage() {
  const params = useParams()
  const deckId = typeof params?.id === 'string' ? params.id : ''
  const userId = getCurrentUserId()

  const [deckName, setDeckName] = useState('')
  const [cards, setCards] = useState<StudyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const reviewedCardIdsRef = useRef(new Set<string>())

  useEffect(() => {
    if (!deckId) {
      setLoading(false)
      setError('Missing deck.')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const res = await fetch(`/api/decks/${encodeURIComponent(deckId)}?userId=${encodeURIComponent(userId)}`)
        const body = (await res.json().catch(() => null)) as
          | { error?: string; deck?: { name: string }; cards?: StudyCard[] }
          | null
        if (!res.ok) throw new Error(body?.error ?? `Failed to load deck (${res.status}).`)
        if (cancelled) return
        setDeckName(body?.deck?.name ?? '')
        setCards(Array.isArray(body?.cards) ? body!.cards! : [])
        setIndex(0)
        setShowAnswer(false)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [deckId, userId])

  const total = cards.length
  const current = cards[index]
  const atStart = index <= 0
  const atEnd = index >= total - 1

  const goPrev = useCallback(() => {
    setShowAnswer(false)
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setShowAnswer(false)
    setIndex((i) => Math.min(total - 1, i + 1))
  }, [total])

  const toggleFlip = useCallback(() => {
    setShowAnswer((wasShowingQuestion) => {
      const cardId = cards[index]?.id
      if (!wasShowingQuestion && cardId && !reviewedCardIdsRef.current.has(cardId)) {
        reviewedCardIdsRef.current.add(cardId)
        recordStudyActivity(userId, deckId, [{ type: 'card_reviewed', quantity: 1 }])
      }
      return !wasShowingQuestion
    })
  }, [cards, deckId, index, userId])

  useEffect(() => {
    reviewedCardIdsRef.current = new Set()
  }, [deckId])

  useEffect(() => {
    if (loading || error || total === 0 || !deckId) return

    const recordSeconds = (seconds: number) => {
      if (seconds <= 0) return
      recordStudyActivity(userId, deckId, [{ type: 'session_seconds', quantity: seconds }])
    }

    const intervalId = window.setInterval(() => {
      recordSeconds(SESSION_TICK_SECONDS)
    }, SESSION_TICK_SECONDS * 1000)

    return () => {
      window.clearInterval(intervalId)
      recordSeconds(SESSION_TICK_SECONDS)
    }
  }, [deckId, error, loading, total, userId])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        toggleFlip()
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleFlip, goPrev, goNext])

  return (
    <div className="min-h-full bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-950/90">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/decks"
            className="shrink-0 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            ← Decks
          </Link>
          {deckId ? (
            <Link
              href={`/decks/${deckId}`}
              className="truncate text-center text-sm font-semibold text-stone-900 dark:text-stone-50"
            >
              {deckName || 'Study'}
            </Link>
          ) : (
            <span className="truncate text-center text-sm font-semibold">Study</span>
          )}
          <span className="w-14 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {loading ? (
          <p className="text-center text-sm text-stone-600 dark:text-stone-400">Loading deck…</p>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {error}
            <div className="mt-4">
              <Link
                href="/decks"
                className="font-semibold text-red-900 underline dark:text-red-100"
              >
                Back to decks
              </Link>
            </div>
          </div>
        ) : total === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
            <p className="text-stone-600 dark:text-stone-400">This deck has no cards yet.</p>
            <Link
              href="/decks/new"
              className="mt-4 inline-flex rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600"
            >
              Create a deck
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-500">
              Card {index + 1} of {total}
            </p>

            <div className="relative">
              <span className="pointer-events-none absolute right-4 top-4 z-10 rounded-full bg-stone-100/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600 shadow-sm backdrop-blur-sm dark:bg-stone-800/95 dark:text-stone-400">
                {showAnswer ? 'Answer' : 'Question'}
              </span>
              {current ? (
                <FlipCard
                  flipped={showAnswer}
                  onFlip={toggleFlip}
                  front={
                    <CardFaceContent
                      text={current.front}
                      className="text-base font-medium leading-relaxed text-stone-900 dark:text-stone-50 sm:text-lg"
                    />
                  }
                  back={
                    <CardFaceContent
                      text={current.back}
                      className="text-base leading-relaxed text-stone-800 dark:text-stone-100 sm:text-lg"
                    />
                  }
                />
              ) : null}
              <p className="mt-6 text-center text-xs text-stone-500 dark:text-stone-500">
                Tap card or press Space to {showAnswer ? 'show question' : 'show answer'}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={goPrev}
                disabled={atStart}
                className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={atEnd}
                className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
              >
                Next
              </button>
            </div>

            <p className="mt-6 text-center text-[11px] text-stone-400 dark:text-stone-600">
              Keyboard: ← → navigate · Space or Enter flips
            </p>
          </>
        )}
      </main>
    </div>
  )
}
