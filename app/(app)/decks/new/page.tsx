'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type SVGProps } from 'react'
import { allocateCardSlots, normalizeMixPct } from '@/app/lib/flashcard-mix'
import { useCurrentUserId } from '@/app/lib/auth'
import { loadDeckPromptHistory, pushDeckPromptHistory } from '@/app/lib/deck-prompt-history'

/** Digits-only, strip redundant leading zeros (e.g. "07"→"7", "0" stays "0"). */
function sanitizeDigitString(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits === '') return ''
  const stripped = digits.replace(/^0+/, '')
  return stripped === '' ? '0' : stripped
}

/** Parsed mix weight (0–100); empty input → 0. */
function parseDeckMixPercent(raw: string): number {
  const s = sanitizeDigitString(raw)
  if (s === '') return 0
  const n = Number.parseInt(s, 10)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}

/** Parsed card count (1–50); empty → 12 so the field stays usable while editing. */
function parseCardCount(raw: string, previous: number): number {
  const s = sanitizeDigitString(raw)
  if (s === '') return previous
  const n = Number.parseInt(s, 10)
  if (!Number.isFinite(n)) return previous
  return Math.min(50, Math.max(1, n))
}

function moveCard<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [removed] = next.splice(from, 1)
  next.splice(to, 0, removed)
  return next
}

function truncatePromptLabel(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function extractMarkdownImageUrls(text: string): string[] {
  const urls: string[] = []
  for (const m of String(text).matchAll(/!\[[^\]]*?\]\(([^)]+)\)/g)) {
    const u = (m[1] ?? '').trim()
    if (u) urls.push(u)
  }
  return [...new Set(urls)]
}

function appendImageMarkdown(text: string, url: string): string {
  const line = `![Uploaded image](${url})`
  const t = text.trim()
  return t ? `${t}\n\n${line}` : line
}

function removeImageMarkdown(text: string, url: string): string {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return String(text)
    .replace(new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)\\s*\\n?`, 'g'), '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function UploadedImageStrip({
  urls,
  disabled,
  onRemove,
}: {
  urls: string[]
  disabled: boolean
  onRemove: (url: string) => void
}) {
  if (urls.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {urls.map((src) => (
        <div
          key={src}
          className="relative w-[calc(50%-0.25rem)] max-w-[11rem] overflow-hidden rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-950/40 sm:w-auto sm:max-w-[10rem]"
        >
          <img src={src} alt="" loading="lazy" className="aspect-[4/3] h-auto w-full object-cover" />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(src)}
            className="absolute right-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}

function GripIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM7 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM7 15.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM16 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM16 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM16 15.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  )
}

export default function NewDeckPage() {
  const userId = useCurrentUserId()

  const [prompt, setPrompt] = useState('')
  const [cardCount, setCardCount] = useState(12)
  const [pctConceptual, setPctConceptual] = useState(70)
  const [pctCalculation, setPctCalculation] = useState(20)
  const [pctVocabulary, setPctVocabulary] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const [deckName, setDeckName] = useState('')
  const [cards, setCards] = useState<Array<{ front: string; back: string }>>([])

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedDeckId, setSavedDeckId] = useState<string | null>(null)

  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const [recentPrompts, setRecentPrompts] = useState<string[]>([])

  const cardImageInputRef = useRef<HTMLInputElement>(null)
  const cardImageTargetRef = useRef<{ idx: number; side: 'front' | 'back' } | null>(null)
  const [cardImageUploadBusy, setCardImageUploadBusy] = useState<{
    idx: number
    side: 'front' | 'back'
  } | null>(null)
  const [cardImageUploadError, setCardImageUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    setRecentPrompts(loadDeckPromptHistory(userId))
  }, [userId])

  const mixWeightsOk = pctConceptual + pctCalculation + pctVocabulary > 0
  const canGenerate = prompt.trim().length > 0 && mixWeightsOk && !isGenerating
  const canSave = deckName.trim().length > 0 && cards.some((c) => c.front.trim() && c.back.trim()) && !isSaving && !isGenerating

  const cleanedCardsCount = useMemo(() => {
    return cards.filter((c) => c.front.trim().length > 0 && c.back.trim().length > 0).length
  }, [cards])

  const mixPctDisplay = useMemo(
    () => normalizeMixPct(pctConceptual, pctCalculation, pctVocabulary),
    [pctConceptual, pctCalculation, pctVocabulary],
  )

  const slotBudget = useMemo(
    () =>
      allocateCardSlots(cardCount, {
        conceptual: mixPctDisplay.conceptual,
        calculation: mixPctDisplay.calculation,
        vocabulary: mixPctDisplay.vocabulary,
      }),
    [cardCount, mixPctDisplay],
  )

  async function generatePreview(overridePrompt?: string) {
    const effectivePrompt = (overridePrompt ?? prompt).trim()
    if (!effectivePrompt || !mixWeightsOk) return

    setPrompt(effectivePrompt)
    setIsGenerating(true)
    setGenerateError(null)
    setSavedDeckId(null)
    setSaveError(null)
    try {
      const res = await fetch('/api/ai/deck-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          prompt: effectivePrompt,
          cardCount,
          mix: {
            conceptualPercent: pctConceptual,
            calculationPercent: pctCalculation,
            vocabularyPercent: pctVocabulary,
          },
        }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? `Failed to generate preview (${res.status}).`)
      }

      const body = (await res.json()) as {
        deck: { name: string; cards: Array<{ front: string; back: string }> }
      }

      setDeckName(body.deck.name ?? '')
      setCards(body.deck.cards ?? [])
      setRecentPrompts(pushDeckPromptHistory(userId, effectivePrompt))
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setIsGenerating(false)
    }
  }

  function importRecentPrompt(text: string) {
    if (isGenerating) return
    setPrompt(text.trim())
    setGenerateError(null)
    setSavedDeckId(null)
  }

  function runRecentPrompt(text: string) {
    if (isGenerating || !mixWeightsOk) return
    void generatePreview(text)
  }

  function openCardImagePicker(idx: number, side: 'front' | 'back') {
    setCardImageUploadError(null)
    cardImageTargetRef.current = { idx, side }
    cardImageInputRef.current?.click()
  }

  async function onCardImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const target = cardImageTargetRef.current
    e.target.value = ''
    if (!file || !target) return

    setCardImageUploadError(null)
    setCardImageUploadBusy({ idx: target.idx, side: target.side })
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('userId', userId)

      const res = await fetch('/api/card-images/upload', {
        method: 'POST',
        body: form,
      })
      const raw = await res.text()
      let body: { error?: string; url?: string } | null = null
      try {
        body = raw ? (JSON.parse(raw) as { error?: string; url?: string }) : null
      } catch {
        body = null
      }
      if (!res.ok) {
        throw new Error(
          body?.error ?? (raw.slice(0, 180) || `Upload failed (${res.status}).`),
        )
      }
      const url = String(body?.url ?? '').trim()
      if (!url) throw new Error('No image URL returned.')

      const { idx, side } = target
      setCards((prev) =>
        prev.map((c, i) =>
          i === idx
            ? { ...c, [side]: appendImageMarkdown(side === 'front' ? c.front : c.back, url) }
            : c,
        ),
      )
    } catch (err) {
      setCardImageUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setCardImageUploadBusy(null)
      cardImageTargetRef.current = null
    }
  }

  async function finalizeAndSave() {
    setIsSaving(true)
    setSaveError(null)
    setSavedDeckId(null)
    try {
      const res = await fetch('/api/decks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: deckName,
          isPublic: false,
          cards,
        }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? `Failed to save deck (${res.status}).`)
      }

      const body = (await res.json()) as { deckId: string }
      setSavedDeckId(body.deckId)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <section className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.32] dark:opacity-20"
            aria-hidden
            style={{
              backgroundImage: `radial-gradient(circle at 15% 20%, rgb(217 119 6 / 0.18), transparent 45%),
                radial-gradient(circle at 85% 10%, rgb(120 53 15 / 0.12), transparent 42%),
                radial-gradient(circle at 40% 110%, rgb(87 83 78 / 0.08), transparent 55%)`,
            }}
          />
          <div className="relative">
            <p className="mb-3 inline-flex rounded-full border border-amber-200/80 bg-amber-100/50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              AI deck builder
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
              Describe what you want to study
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-stone-600 dark:text-stone-400">
              Paste a topic, syllabus section, or learning goal. You’ll get a preview deck you can revise, edit, and then save.
            </p>

            <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <label className="text-sm font-medium text-stone-900 dark:text-stone-100">Deck prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Example: Make a deck for AP Biology cellular respiration. Focus on key terms, steps, and common misconceptions."
                  rows={7}
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white/70 p-4 text-sm text-stone-900 shadow-sm outline-none ring-0 transition focus:border-amber-300 dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-50"
                />

                <div className="mt-6 rounded-2xl border border-stone-200 bg-white/70 p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950/20">
                  <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">Deck size & mix</div>
                  <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
                    Set deck length and approximate balance of conceptual prompts, quantitative/calculation drills, and
                    vocabulary recall. Rough weights scale to percentages that sum to 100%.
                  </p>

                  <div className="mt-4">
                    <label htmlFor="card-count" className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      Number of cards
                    </label>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <input
                        id="card-count"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        aria-label="Number of cards"
                        value={String(cardCount)}
                        onChange={(e) =>
                          setCardCount((prev) => parseCardCount(e.target.value, prev))
                        }
                        className="w-full max-w-[8rem] rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition focus:border-amber-300 dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-50 sm:w-auto"
                      />
                      <span className="text-xs text-stone-500 dark:text-stone-400">Max 50 (matches preview limit).</span>
                    </div>
                  </div>

                  <fieldset className="mt-6">
                    <legend className="sr-only">Mix of conceptual, calculation, and vocabulary flashcards</legend>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label htmlFor="pct-conceptual" className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
                          Conceptual
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            id="pct-conceptual"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-label="Conceptual percentage"
                            value={String(pctConceptual)}
                            onChange={(e) => setPctConceptual(parseDeckMixPercent(e.target.value))}
                            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-50"
                          />
                          <span className="text-sm text-stone-500 dark:text-stone-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="pct-calculation" className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
                          Calculation
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            id="pct-calculation"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-label="Calculation percentage"
                            value={String(pctCalculation)}
                            onChange={(e) => setPctCalculation(parseDeckMixPercent(e.target.value))}
                            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-50"
                          />
                          <span className="text-sm text-stone-500 dark:text-stone-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="pct-vocabulary" className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
                          Vocabulary
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            id="pct-vocabulary"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-label="Vocabulary percentage"
                            value={String(pctVocabulary)}
                            onChange={(e) => setPctVocabulary(parseDeckMixPercent(e.target.value))}
                            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-50"
                          />
                          <span className="text-sm text-stone-500 dark:text-stone-400">%</span>
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <div className="mt-4 space-y-1 text-xs text-stone-600 dark:text-stone-400">
                    <p>
                      <span className="font-medium text-stone-900 dark:text-stone-200">Scaled mix:</span> conceptual{' '}
                      {mixPctDisplay.conceptual}% · calculation {mixPctDisplay.calculation}% · vocabulary{' '}
                      {mixPctDisplay.vocabulary}%
                    </p>
                    <p>
                      <span className="font-medium text-stone-900 dark:text-stone-200">Card budget:</span> conceptual{' '}
                      {slotBudget.conceptual} · calculation {slotBudget.calculation} · vocabulary {slotBudget.vocabulary}
                      <span className="text-stone-400"> (sums to {cardCount})</span>
                    </p>
                  </div>

                  {!mixWeightsOk ? (
                    <p className="mt-4 text-xs font-medium text-amber-800 dark:text-amber-200">
                      Adjust the mix percentages so they add up above zero — they need not total 100%.
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void generatePreview()}
                    disabled={!canGenerate}
                    className="inline-flex rounded-full bg-amber-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
                  >
                    {isGenerating ? 'Generating…' : cards.length > 0 ? 'Regenerate preview' : 'Generate preview'}
                  </button>

                </div>

                {generateError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                    {generateError}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950/30">
                  <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">How it works</div>
                  <ol className="mt-3 space-y-3 text-sm text-stone-600 dark:text-stone-400">
                    <li className="flex gap-3">
                      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                        1
                      </span>
                      <span>Write a prompt. More constraints → better cards.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                        2
                      </span>
                      <span>Review the preview deck. Edit anything directly.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                        3
                      </span>
                      <span>Finalize to save it to Supabase (for your current user id stub).</span>
                    </li>
                  </ol>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950/30">
                  <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">Import templates</div>
                  <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                    Pull in material you already have—past prompts, exports from other apps, or downloads from the
                    web—and finish in the preview editor below.
                  </p>

                  {recentPrompts.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-amber-200/70 bg-white/70 p-3 dark:border-amber-900/40 dark:bg-stone-900/40">
                      <div className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                        Past deck prompts
                      </div>
                      <ul className="mt-2.5 space-y-2">
                        {recentPrompts.map((p, i) => (
                          <li
                            key={`${i}-${p.slice(0, 32)}`}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/90 px-2.5 py-2 dark:border-stone-700 dark:bg-stone-950/50"
                          >
                            <span
                              className="min-w-0 flex-1 truncate text-xs text-stone-800 dark:text-stone-100"
                              title={p}
                            >
                              {truncatePromptLabel(p, 52)}
                            </span>
                            <div className="flex shrink-0 flex-wrap gap-1.5">
                              <button
                                type="button"
                                aria-label={`Import prompt: ${truncatePromptLabel(p, 80)}`}
                                disabled={isGenerating}
                                onClick={() => importRecentPrompt(p)}
                                className="inline-flex rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-700 transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-amber-600 dark:hover:bg-amber-950/40"
                              >
                                Import
                              </button>
                              <button
                                type="button"
                                aria-label={`Generate preview from prompt: ${truncatePromptLabel(p, 80)}`}
                                disabled={isGenerating || !mixWeightsOk}
                                onClick={() => runRecentPrompt(p)}
                                className="inline-flex rounded-full bg-amber-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
                              >
                                Generate
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">Preview deck</h2>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                {cards.length === 0 ? 'Generate a preview to start editing.' : `${cleanedCardsCount} cards ready to save.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCards((prev) => [...prev, { front: '', back: '' }])}
                disabled={isGenerating || isSaving}
                className="inline-flex rounded-full border border-stone-300 bg-white/60 px-4 py-2 text-sm font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-100 dark:hover:border-stone-500"
              >
                Add card
              </button>
              <button
                type="button"
                onClick={finalizeAndSave}
                disabled={!canSave}
                className="inline-flex rounded-full bg-amber-700 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                {isSaving ? 'Saving…' : 'Finalize & save'}
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
            <input
              ref={cardImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={onCardImageFileChange}
            />
            <label className="text-sm font-medium text-stone-900 dark:text-stone-100">Deck name</label>
            <input
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="e.g. Cellular respiration — AP Bio"
              className="mt-2 w-full rounded-xl border border-stone-200 bg-white/70 px-4 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:border-amber-300 dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-50"
            />

            {cards.length === 0 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="h-28 rounded-2xl bg-stone-200/60 dark:bg-stone-800/50" />
                <div className="h-28 rounded-2xl bg-stone-200/50 dark:bg-stone-800/40" />
                <div className="hidden h-28 rounded-2xl bg-stone-200/45 dark:bg-stone-800/35 sm:block" />
                <div className="hidden h-28 rounded-2xl bg-stone-200/40 dark:bg-stone-800/30 sm:block" />
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {cardImageUploadError ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                    {cardImageUploadError}
                  </div>
                ) : null}
                {cards.map((card, idx) => (
                  <div
                    key={idx}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      setDragOverIndex(idx)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const raw = e.dataTransfer.getData('text/plain')
                      const from = raw !== '' ? Number.parseInt(raw, 10) : dragFromIndex
                      if (from === null || Number.isNaN(from) || from === idx) {
                        setDragFromIndex(null)
                        setDragOverIndex(null)
                        return
                      }
                      setCards((prev) => moveCard(prev, from, idx))
                      setDragFromIndex(null)
                      setDragOverIndex(null)
                    }}
                    className={[
                      'rounded-2xl border bg-stone-50 p-4 shadow-sm transition dark:bg-stone-950/20',
                      dragOverIndex === idx && dragFromIndex !== null && dragFromIndex !== idx
                        ? 'border-amber-400 ring-2 ring-amber-300/40 dark:border-amber-600 dark:ring-amber-600/30'
                        : 'border-stone-200 dark:border-stone-800',
                      dragFromIndex === idx ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <button
                          type="button"
                          draggable
                          title="Drag to reorder"
                          aria-label={`Drag to reorder card ${idx + 1}`}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', String(idx))
                            setDragFromIndex(idx)
                          }}
                          onDragEnd={() => {
                            setDragFromIndex(null)
                            setDragOverIndex(null)
                          }}
                          className="inline-flex shrink-0 cursor-grab touch-none rounded-md border border-transparent p-1 text-stone-400 transition hover:border-stone-300 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing dark:hover:border-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                        >
                          <GripIcon className="size-5" />
                        </button>
                        <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">Card {idx + 1}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCards((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-xs font-medium text-red-700 hover:underline dark:text-red-200"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Front</label>
                          <button
                            type="button"
                            disabled={isGenerating || isSaving || !!cardImageUploadBusy}
                            onClick={() => openCardImagePicker(idx, 'front')}
                            className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 hover:underline disabled:opacity-50 dark:text-amber-200"
                          >
                            {cardImageUploadBusy?.idx === idx && cardImageUploadBusy?.side === 'front'
                              ? 'Uploading…'
                              : 'Add image'}
                          </button>
                        </div>
                        <textarea
                          value={card.front}
                          onChange={(e) =>
                            setCards((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, front: e.target.value } : c)),
                            )
                          }
                          rows={3}
                          className="mt-1 w-full rounded-xl border border-stone-200 bg-white/70 p-3 text-sm text-stone-900 shadow-sm outline-none transition focus:border-amber-300 dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-50"
                        />
                        <UploadedImageStrip
                          urls={extractMarkdownImageUrls(card.front)}
                          disabled={isGenerating || isSaving || !!cardImageUploadBusy}
                          onRemove={(src) =>
                            setCards((prev) =>
                              prev.map((c, i) =>
                                i === idx ? { ...c, front: removeImageMarkdown(c.front, src) } : c,
                              ),
                            )
                          }
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Back</label>
                          <button
                            type="button"
                            disabled={isGenerating || isSaving || !!cardImageUploadBusy}
                            onClick={() => openCardImagePicker(idx, 'back')}
                            className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 hover:underline disabled:opacity-50 dark:text-amber-200"
                          >
                            {cardImageUploadBusy?.idx === idx && cardImageUploadBusy?.side === 'back'
                              ? 'Uploading…'
                              : 'Add image'}
                          </button>
                        </div>
                        <textarea
                          value={card.back}
                          onChange={(e) =>
                            setCards((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, back: e.target.value } : c)),
                            )
                          }
                          rows={3}
                          className="mt-1 w-full rounded-xl border border-stone-200 bg-white/70 p-3 text-sm text-stone-900 shadow-sm outline-none transition focus:border-amber-300 dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-50"
                        />
                        <UploadedImageStrip
                          urls={extractMarkdownImageUrls(card.back)}
                          disabled={isGenerating || isSaving || !!cardImageUploadBusy}
                          onRemove={(src) =>
                            setCards((prev) =>
                              prev.map((c, i) =>
                                i === idx ? { ...c, back: removeImageMarkdown(c.back, src) } : c,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {saveError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                {saveError}
              </div>
            ) : null}

            {savedDeckId ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                Saved!{' '}
                <Link href={`/decks/${savedDeckId}`} className="font-semibold hover:underline">
                  Open deck
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}

