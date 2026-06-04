'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/app/components/ui/dialog'
import { Dropdown, DropdownButton, DropdownDivider, DropdownItem, DropdownMenu } from '@/app/components/ui/dropdown'
import { Description, Field, FieldGroup, Label } from '@/app/components/ui/fieldset'
import { Input } from '@/app/components/ui/input'
import { Listbox, ListboxOption } from '@/app/components/ui/listbox'
import { Select } from '@/app/components/ui/select'
import { Switch, SwitchField } from '@/app/components/ui/switch'
import { getCurrentUserId } from '@/app/lib/auth'
import { formatTimeFromNow } from '@/app/lib/format-time-from-now'

type DeckVisibility = 'Private' | 'Unlisted' | 'Public'

const DECK_LOAD_ERROR = 'Could not find deck data'
const DECKS_PER_PAGE = 10

type DeckSummary = {
  id: string
  name: string
  cards: number
  visibility: DeckVisibility
  createdAt: string | null
  lastEditedAt: string | null
}

type VisibilityFilter = 'all' | 'Public' | 'Private'
type DeckSort = 'cards' | 'created' | 'updated'
type SortOrder = 'asc' | 'desc'

const SORT_OPTIONS: { value: DeckSort; label: string }[] = [
  { value: 'updated', label: 'Last edited' },
  { value: 'created', label: 'Create date' },
  { value: 'cards', label: 'Number of cards' },
]

function sortOrderLabels(sortBy: DeckSort): Record<SortOrder, string> {
  if (sortBy === 'cards') {
    return { desc: 'Most first', asc: 'Fewest first' }
  }
  return { desc: 'Newest first', asc: 'Oldest first' }
}

function timestampMs(iso: string | null): number {
  if (!iso) return 0
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? 0 : ms
}

function compareDecks(a: DeckSummary, b: DeckSummary, sort: DeckSort, order: SortOrder): number {
  let result = 0
  switch (sort) {
    case 'cards':
      result = a.cards - b.cards
      break
    case 'created':
      result = timestampMs(a.createdAt) - timestampMs(b.createdAt)
      break
    case 'updated':
      result = timestampMs(a.lastEditedAt) - timestampMs(b.lastEditedAt)
      break
  }

  if (result === 0) result = a.name.localeCompare(b.name)
  return order === 'asc' ? result : -result
}

function EllipsisIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM14 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
    </svg>
  )
}

function DeckOptionsMenu({
  deckId,
  onEditDeck,
  onDelete,
}: {
  deckId: string
  onEditDeck: () => void
  onDelete: () => void
}) {
  return (
    <Dropdown>
      <DropdownButton
        as="button"
        type="button"
        aria-label="Deck options"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white/60 text-stone-600 backdrop-blur transition hover:border-stone-400 hover:bg-white data-open:border-stone-400 data-open:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-300 dark:hover:border-stone-500 dark:data-open:border-stone-500"
      >
        <EllipsisIcon className="size-5" />
      </DropdownButton>
      <DropdownMenu anchor="bottom end">
        <DropdownItem onClick={onEditDeck}>Edit deck</DropdownItem>
        <DropdownItem href={`/decks/${deckId}/edit`}>Edit cards</DropdownItem>
        <DropdownDivider />
        <DropdownItem
          onClick={onDelete}
          className="text-red-600 data-focus:bg-red-600 data-focus:text-white dark:text-red-400"
        >
          Delete
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

function EditDeckModal({
  deck,
  onClose,
  onSaved,
}: {
  deck: DeckSummary | null
  onClose: () => void
  onSaved: (deck: DeckSummary) => void
}) {
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!deck) return
    setName(deck.name)
    setIsPublic(deck.visibility === 'Public')
    setSaveError(null)
    setIsSaving(false)
  }, [deck])

  async function handleSave() {
    if (!deck) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setSaveError('Deck name is required.')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      await updateDeckMetadata(deck.id, getCurrentUserId(), trimmedName, isPublic)
      onSaved({
        ...deck,
        name: trimmedName,
        visibility: isPublic ? 'Public' : 'Private',
      })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save deck.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={deck !== null} onClose={onClose} size="md">
      <DialogTitle>Edit deck</DialogTitle>
      <DialogDescription>Update the deck name and who can see it.</DialogDescription>

      <DialogBody>
        <FieldGroup>
          <Field>
            <Label>Deck name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Deck name"
              autoFocus
            />
          </Field>

          <SwitchField>
            <Label>Public deck</Label>
            <Description>Public decks can appear in the community library.</Description>
            <Switch checked={isPublic} onChange={setIsPublic} color="amber" />
          </SwitchField>
        </FieldGroup>

        {saveError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {saveError}
          </p>
        ) : null}
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button color="amber" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function DeleteDeckDialog({
  deck,
  onClose,
  onConfirm,
}: {
  deck: DeckSummary | null
  onClose: () => void
  onConfirm: (id: string) => void
}) {
  return (
    <Dialog open={deck !== null} onClose={onClose} size="sm">
      <DialogTitle>Delete deck?</DialogTitle>
      <DialogDescription>
        {deck ? (
          <>
            This will permanently delete <span className="font-medium text-zinc-950 dark:text-white">{deck.name}</span>{' '}
            and all {deck.cards} {deck.cards === 1 ? 'card' : 'cards'}. This cannot be undone.
          </>
        ) : null}
      </DialogDescription>

      <DialogActions>
        <Button plain onClick={onClose}>
          Cancel
        </Button>
        <Button
          color="red"
          onClick={() => {
            if (!deck) return
            onClose()
            onConfirm(deck.id)
          }}
        >
          Delete deck
        </Button>
      </DialogActions>
    </Dialog>
  )
}

async function updateDeckMetadata(
  deckId: string,
  userId: string,
  name: string,
  isPublic: boolean,
): Promise<void> {
  const res = await fetch(`/api/decks/${encodeURIComponent(deckId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, name, isPublic }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Failed to update deck (${res.status}).`)
  }
}

function VisibilityPill({ value }: { value: DeckVisibility }) {
  const styles =
    value === 'Public'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
      : value === 'Unlisted'
        ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
        : 'border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-900/30 dark:text-stone-200'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}>
      {value}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
          <div className="mt-2 h-3 w-1/2 rounded bg-stone-200 dark:bg-stone-800" />
        </div>
        <div className="h-7 w-20 rounded-full bg-stone-200 dark:bg-stone-800" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="h-8 w-28 rounded-full bg-stone-200 dark:bg-stone-800" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 rounded-full bg-stone-200 dark:bg-stone-800" />
          <div className="h-8 w-18 rounded-full bg-stone-200 dark:bg-stone-800" />
        </div>
      </div>
    </div>
  )
}

function ErrorPlaceholder({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-stone-900/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.25] dark:opacity-15"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 20% 25%, rgb(239 68 68 / 0.14), transparent 45%),
              radial-gradient(circle at 85% 20%, rgb(127 29 29 / 0.10), transparent 42%)`,
          }}
        />

        <div className="relative" role="alert">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{DECK_LOAD_ERROR}</h2>
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Try again
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-100/80 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/60">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-50">What you can do</h3>
        <ul className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-400">
          <li>Check your connection and try again.</li>
          <li>If the problem persists, your database may not be set up yet.</li>
          <li>You can still create a new deck while this is resolved.</li>
        </ul>
        <Link
          href="/decks/new"
          className="mt-5 inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          Create deck
        </Link>
      </div>
    </div>
  )
}

function DeckFilters({
  searchQuery,
  visibilityFilter,
  sortBy,
  sortOrder,
  onSearchChange,
  onVisibilityChange,
  onSortChange,
  onSortOrderChange,
}: {
  searchQuery: string
  visibilityFilter: VisibilityFilter
  sortBy: DeckSort
  sortOrder: SortOrder
  onSearchChange: (value: string) => void
  onVisibilityChange: (value: VisibilityFilter) => void
  onSortChange: (value: DeckSort) => void
  onSortOrderChange: (value: SortOrder) => void
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <Field className="min-w-0 flex-1 sm:min-w-[12rem]">
        <Label>Search</Label>
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by deck name"
        />
      </Field>

      <Field className="w-full sm:w-52">
        <Label>Visibility</Label>
        <Select
          value={visibilityFilter}
          onChange={(e) => onVisibilityChange(e.target.value as VisibilityFilter)}
          aria-label="Filter by visibility"
        >
          <option value="all">All decks</option>
          <option value="Public">Public</option>
          <option value="Private">Private</option>
        </Select>
      </Field>

      <Field className="w-full sm:w-52">
        <Label>Sort by</Label>
        <Listbox value={sortBy} onChange={onSortChange} aria-label="Sort decks">
          {SORT_OPTIONS.map((option) => (
            <ListboxOption key={option.value} value={option.value}>
              {option.label}
            </ListboxOption>
          ))}
        </Listbox>
      </Field>

      <Field className="w-full sm:w-44">
        <Label>Order</Label>
        <Listbox value={sortOrder} onChange={onSortOrderChange} aria-label="Sort order">
          {(['desc', 'asc'] as const).map((order) => (
            <ListboxOption key={order} value={order}>
              {sortOrderLabels(sortBy)[order]}
            </ListboxOption>
          ))}
        </Listbox>
      </Field>
    </div>
  )
}

function FilteredEmptyPlaceholder({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">No decks match your filters</h2>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        Try a different search term or visibility setting.
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

function DecksPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const pageButtonClass = (active: boolean) =>
    active
      ? 'border-amber-700 bg-amber-700 text-white dark:border-amber-600 dark:bg-amber-600'
      : 'border-stone-300 bg-white/70 text-stone-800 hover:border-stone-400 hover:bg-white dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500'

  const navButtonClass =
    'inline-flex rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-sm font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500'

  return (
    <nav
      aria-label="Deck pages"
      className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between"
    >
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Page {currentPage} of {totalPages}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={navButtonClass}
        >
          Previous
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              className={`inline-flex size-9 items-center justify-center rounded-full border text-sm font-medium transition ${pageButtonClass(page === currentPage)}`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={navButtonClass}
        >
          Next
        </button>
      </div>
    </nav>
  )
}

function EmptyPlaceholder() {
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
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">No decks yet</h2>
          <p className="mt-2 max-w-lg text-sm text-stone-600 dark:text-stone-400">
            Your library is empty. Create a deck, add a few cards, and start studying in a calmer flow.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="h-12 rounded-xl bg-stone-200/70 dark:bg-stone-800/70" />
            <div className="h-12 rounded-xl bg-stone-200/60 dark:bg-stone-800/60" />
            <div className="h-12 rounded-xl bg-stone-200/50 dark:bg-stone-800/50" />
            <div className="h-12 rounded-xl bg-stone-200/50 dark:bg-stone-800/50" />
            <div className="h-12 rounded-xl bg-stone-200/40 dark:bg-stone-800/40" />
            <div className="h-12 rounded-xl bg-stone-200/35 dark:bg-stone-800/35" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-amber-900 via-amber-800 to-stone-900 p-6 text-amber-50 shadow-sm dark:border-stone-800 dark:from-stone-900 dark:via-amber-950 dark:to-stone-950">
        <h3 className="text-lg font-semibold">Create your first deck</h3>
        <p className="mt-2 text-sm text-amber-100/90">Start small. Name it clearly. Add cards as you go.</p>
        <Link
          href="/decks/new"
          className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-amber-900 shadow transition hover:bg-amber-50"
        >
          Create deck
        </Link>
      </div>
    </div>
  )
}

async function fetchDecks(userId: string, signal?: AbortSignal): Promise<DeckSummary[]> {
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
      updated_at: string | null
      created_at: string | null
      last_edited_at: string | null
    }>
  }

  return (body.decks ?? []).map((deck) => ({
    id: deck.id,
    name: deck.name,
    cards: deck.cards ?? 0,
    visibility: deck.is_public ? 'Public' : 'Private',
    createdAt: deck.created_at,
    lastEditedAt: deck.last_edited_at,
  }))
}

async function deleteDeck(deckId: string, userId: string): Promise<void> {
  const res = await fetch(
    `/api/decks/${encodeURIComponent(deckId)}?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Failed to delete deck (${res.status}).`)
  }
}

export default function DecksPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [editingDeck, setEditingDeck] = useState<DeckSummary | null>(null)
  const [deckToDelete, setDeckToDelete] = useState<DeckSummary | null>(null)
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [sortBy, setSortBy] = useState<DeckSort>('updated')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [now, setNow] = useState(() => Date.now())
  const decksRef = useRef(decks)
  decksRef.current = decks
  const activeLoadIdRef = useRef(0)

  const totalCount = decks.length
  const hasActiveFilters = searchQuery.trim() !== '' || visibilityFilter !== 'all'

  const sortedDecks = useMemo(() => {
    return [...decks].sort((a, b) => compareDecks(a, b, sortBy, sortOrder))
  }, [decks, sortBy, sortOrder])

  const filteredDecks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return sortedDecks.filter((deck) => {
      if (query && !deck.name.toLowerCase().includes(query)) return false
      if (visibilityFilter === 'Public' && deck.visibility !== 'Public') return false
      if (visibilityFilter === 'Private' && deck.visibility !== 'Private') return false
      return true
    })
  }, [sortedDecks, searchQuery, visibilityFilter])

  const totalPages = Math.max(1, Math.ceil(filteredDecks.length / DECKS_PER_PAGE))

  const paginatedDecks = useMemo(() => {
    const start = (currentPage - 1) * DECKS_PER_PAGE
    return filteredDecks.slice(start, start + DECKS_PER_PAGE)
  }, [filteredDecks, currentPage])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, visibilityFilter, sortBy, sortOrder])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setVisibilityFilter('all')
  }, [])

  const load = useCallback(async (signal?: AbortSignal) => {
    const loadId = ++activeLoadIdRef.current
    setIsLoading(true)
    setError(null)
    try {
      const url = new URL(window.location.href)
      const forced = url.searchParams.get('state')
      if (forced === 'error') throw new Error(DECK_LOAD_ERROR)
      if (forced === 'empty') {
        if (activeLoadIdRef.current === loadId) setDecks([])
        return
      }

      const result = await fetchDecks(getCurrentUserId(), signal)
      if (activeLoadIdRef.current === loadId) {
        setDecks(result)
        setCurrentPage(1)
        setSearchQuery('')
        setVisibilityFilter('all')
        setSortBy('updated')
        setSortOrder('desc')
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (activeLoadIdRef.current === loadId) setError(DECK_LOAD_ERROR)
    } finally {
      if (activeLoadIdRef.current === loadId) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const onDelete = useCallback(async (id: string) => {
    const removedDeck = decksRef.current.find((deck) => deck.id === id)
    if (!removedDeck) return

    setDecks((prev) => prev.filter((deck) => deck.id !== id))
    setDeleteError(null)

    try {
      await deleteDeck(id, getCurrentUserId())
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete deck.'
      setDecks((prev) => {
        if (prev.some((deck) => deck.id === id)) return prev
        return [...prev, removedDeck]
      })
      setDeleteError(message)
    }
  }, [])

  return (
    <div className="min-h-full bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <EditDeckModal
        deck={editingDeck}
        onClose={() => setEditingDeck(null)}
        onSaved={(updated) => {
          const editedAt = new Date().toISOString()
          setDecks((prev) =>
            prev.map((deck) =>
              deck.id === updated.id ? { ...updated, lastEditedAt: editedAt } : deck,
            ),
          )
          setNow(Date.now())
          setEditingDeck(null)
        }}
      />
      <DeleteDeckDialog
        deck={deckToDelete}
        onClose={() => setDeckToDelete(null)}
        onConfirm={(id) => void onDelete(id)}
      />
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
                Library
              </p>
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl">
                My Decks
              </h1>
              <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-700/70 dark:bg-amber-500/70" />
                    Loading decks…
                  </span>
                ) : error ? (
                  <span className="inline-flex items-center gap-2 text-red-700 dark:text-red-300">
                    <span className="size-2 rounded-full bg-red-600 dark:bg-red-400" />
                    {DECK_LOAD_ERROR}
                  </span>
                ) : hasActiveFilters ? (
                  <span>
                    Showing {filteredDecks.length} of {totalCount} decks
                  </span>
                ) : (
                  <span>Total decks: {totalCount}</span>
                )}
              </p>
            </div>

          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {deleteError ? (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          >
            <span>Could not delete deck. {deleteError}</span>
            <button
              type="button"
              onClick={() => setDeleteError(null)}
              className="shrink-0 font-medium underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <section>
          {error ? (
            <ErrorPlaceholder onRetry={() => void load()} />
          ) : isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="animate-pulse">
                <SkeletonRow />
              </div>
              <div className="animate-pulse">
                <SkeletonRow />
              </div>
              <div className="animate-pulse">
                <SkeletonRow />
              </div>
              <div className="hidden animate-pulse sm:block">
                <SkeletonRow />
              </div>
              <div className="hidden animate-pulse lg:block">
                <SkeletonRow />
              </div>
              <div className="hidden animate-pulse lg:block">
                <SkeletonRow />
              </div>
            </div>
          ) : sortedDecks.length === 0 ? (
            <EmptyPlaceholder />
          ) : (
            <>
              <DeckFilters
                searchQuery={searchQuery}
                visibilityFilter={visibilityFilter}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSearchChange={setSearchQuery}
                onVisibilityChange={setVisibilityFilter}
                onSortChange={setSortBy}
                onSortOrderChange={setSortOrder}
              />
              {filteredDecks.length === 0 ? (
                <FilteredEmptyPlaceholder onClear={clearFilters} />
              ) : (
                <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedDecks.map((deck) => (
                  <div
                    key={deck.id}
                    className="group flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/decks/${deck.id}`}
                          className="block truncate text-base font-semibold text-stone-900 hover:underline dark:text-stone-50"
                        >
                          {deck.name}
                        </Link>
                        <div className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                          {deck.cards} cards
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <VisibilityPill value={deck.visibility} />
                        <DeckOptionsMenu
                          deckId={deck.id}
                          onEditDeck={() => setEditingDeck(deck)}
                          onDelete={() => setDeckToDelete(deck)}
                        />
                      </div>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                      <Link
                        href={`/decks/${deck.id}/study`}
                        className="inline-flex rounded-full border border-stone-300 bg-white/60 px-3 py-1.5 text-xs font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
                      >
                        Study
                      </Link>
                      <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
                        edited {formatTimeFromNow(deck.lastEditedAt, now)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <DecksPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}