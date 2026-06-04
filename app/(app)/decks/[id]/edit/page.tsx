'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type SVGProps } from 'react'
import { getCurrentUserId } from '@/app/lib/auth'

function moveCard<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [removed] = next.splice(from, 1)
  next.splice(to, 0, removed)
  return next
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

export default function EditDeckPage() {
  const params = useParams()
  const deckId = typeof params?.id === 'string' ? params.id : ''
  const userId = getCurrentUserId()

  const [deckName, setDeckName] = useState('')
  const [cards, setCards] = useState<Array<{ front: string; back: string }>>([])
  const [canEdit, setCanEdit] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const cardImageInputRef = useRef<HTMLInputElement>(null)
  const cardImageTargetRef = useRef<{ idx: number; side: 'front' | 'back' } | null>(null)
  const [cardImageUploadBusy, setCardImageUploadBusy] = useState<{
    idx: number
    side: 'front' | 'back'
  } | null>(null)
  const [cardImageUploadError, setCardImageUploadError] = useState<string | null>(null)

  const cleanedCardsCount = useMemo(() => {
    return cards.filter((c) => c.front.trim().length > 0 && c.back.trim().length > 0).length
  }, [cards])

  const canSave =
    deckId &&
    canEdit &&
    deckName.trim().length > 0 &&
    cards.some((c) => c.front.trim() && c.back.trim()) &&
    !isSaving &&
    !loading

  const loadDeck = useCallback(async () => {
    if (!deckId) {
      setLoading(false)
      setLoadError('Missing deck.')
      return
    }
    setLoading(true)
    setLoadError(null)
    setSavedOk(false)
    try {
      const res = await fetch(`/api/decks/${encodeURIComponent(deckId)}?userId=${encodeURIComponent(userId)}`)
      const body = (await res.json().catch(() => null)) as {
        error?: string
        deck?: { name: string }
        cards?: Array<{ front: string; back: string }>
        canEdit?: boolean
      } | null
      if (!res.ok) throw new Error(body?.error ?? `Failed to load (${res.status}).`)
      setDeckName(body?.deck?.name ?? '')
      setCanEdit(body?.canEdit !== false)
      const loaded = Array.isArray(body?.cards) ? body!.cards! : []
      setCards(
        loaded.length > 0
          ? loaded.map((c) => ({ front: c.front ?? '', back: c.back ?? '' }))
          : [{ front: '', back: '' }],
      )
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [deckId, userId])

  useEffect(() => {
    void loadDeck()
  }, [loadDeck])

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

      const res = await fetch('/api/card-images/upload', { method: 'POST', body: form })
      const raw = await res.text()
      let parsed: { error?: string; url?: string } | null = null
      try {
        parsed = raw ? (JSON.parse(raw) as { error?: string; url?: string }) : null
      } catch {
        parsed = null
      }
      if (!res.ok) {
        throw new Error((parsed?.error ?? raw.slice(0, 180)) || `Upload failed (${res.status}).`)
      }
      const url = String(parsed?.url ?? '').trim()
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

  async function saveDeck() {
    if (!deckId || !canSave) return
    setIsSaving(true)
    setSaveError(null)
    setSavedOk(false)
    try {
      const res = await fetch(`/api/decks/${encodeURIComponent(deckId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: deckName.trim(),
          cards,
        }),
      })
      const raw = await res.text()
      let body: { error?: string } | null = null
      try {
        body = raw ? (JSON.parse(raw) as { error?: string }) : null
      } catch {
        body = null
      }
      if (!res.ok) throw new Error((body?.error ?? raw.slice(0, 180)) || `Save failed (${res.status}).`)
      setSavedOk(true)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-950/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/decks"
            className="text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            ← Decks
          </Link>
          <div className="text-sm font-semibold">Edit deck</div>
          {deckId ? (
            <Link
              href={`/decks/${deckId}/study`}
              className="text-sm font-medium text-amber-800 hover:underline dark:text-amber-200"
            >
              Study
            </Link>
          ) : (
            <span className="w-12" aria-hidden />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {loading ? (
          <p className="text-center text-sm text-stone-600 dark:text-stone-400">Loading deck…</p>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {loadError}
            <div className="mt-4">
              <Link href="/decks" className="font-semibold underline">
                Back to decks
              </Link>
            </div>
          </div>
        ) : !canEdit ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
            <p className="text-stone-600 dark:text-stone-400">
              You can view this deck, but only the owner can edit it.
            </p>
            {deckId ? (
              <Link
                href={`/decks/${deckId}/study`}
                className="mt-6 inline-flex rounded-full bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600"
              >
                Study instead
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                  {deckName || 'Untitled'}
                </h1>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                  {cleanedCardsCount} card{cleanedCardsCount === 1 ? '' : 's'} with front &amp; back filled.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCards((prev) => [...prev, { front: '', back: '' }])}
                  disabled={isSaving}
                  className="inline-flex rounded-full border border-stone-300 bg-white/60 px-4 py-2 text-sm font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-100"
                >
                  Add card
                </button>
                <button
                  type="button"
                  onClick={() => void saveDeck()}
                  disabled={!canSave}
                  className="inline-flex rounded-full bg-amber-700 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
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
                placeholder="Deck name"
                className="mt-2 w-full rounded-xl border border-stone-200 bg-white/70 px-4 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:border-amber-300 dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-50"
              />

              {saveError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {saveError}
                </div>
              ) : null}

              {savedOk ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                  Saved successfully.
                </div>
              ) : null}

              <div className="mt-6 space-y-4">
                {cardImageUploadError ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                    {cardImageUploadError}
                  </div>
                ) : null}
                {cards.map((card, idx) => (
                  <div
                    key={`card-${idx}`}
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
                        <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                          Card {idx + 1}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCards((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={isSaving}
                        className="text-xs font-medium text-red-700 hover:underline disabled:opacity-40 dark:text-red-200"
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
                            disabled={isSaving || !!cardImageUploadBusy}
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
                          disabled={isSaving}
                          className="mt-1 w-full rounded-xl border border-stone-200 bg-white/70 p-3 text-sm text-stone-900 shadow-sm outline-none transition focus:border-amber-300 disabled:opacity-60 dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-50"
                        />
                        <UploadedImageStrip
                          urls={extractMarkdownImageUrls(card.front)}
                          disabled={isSaving || !!cardImageUploadBusy}
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
                            disabled={isSaving || !!cardImageUploadBusy}
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
                          disabled={isSaving}
                          className="mt-1 w-full rounded-xl border border-stone-200 bg-white/70 p-3 text-sm text-stone-900 shadow-sm outline-none transition focus:border-amber-300 disabled:opacity-60 dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-50"
                        />
                        <UploadedImageStrip
                          urls={extractMarkdownImageUrls(card.back)}
                          disabled={isSaving || !!cardImageUploadBusy}
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
            </div>
          </>
        )}
      </main>
    </div>
  )
}
