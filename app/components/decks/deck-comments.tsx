'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Field, Label } from '@/app/components/ui/fieldset'
import { Textarea } from '@/app/components/ui/textarea'
import { formatTimeFromNow } from '@/app/lib/format-time-from-now'

const MAX_COMMENT_LENGTH = 2000

type DeckComment = {
  id: string
  profile_id: string
  author_label: string
  body: string
  created_at: string
  can_delete: boolean
}

function CommentSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/40">
      <div className="h-3 w-24 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
    </div>
  )
}

async function fetchComments(deckId: string, signal?: AbortSignal): Promise<DeckComment[]> {
  const response = await fetch(`/api/decks/${encodeURIComponent(deckId)}/comments`, { signal })
  const body = (await response.json().catch(() => null)) as { error?: string; comments?: DeckComment[] } | null

  if (!response.ok) {
    throw new Error(body?.error ?? `Failed to load comments (${response.status}).`)
  }

  return body?.comments ?? []
}

type DeckCommentsProps = {
  deckId: string
}

export function DeckComments({ deckId }: DeckCommentsProps) {
  const [comments, setComments] = useState<DeckComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const activeLoadIdRef = useRef(0)

  const load = useCallback(async (signal?: AbortSignal) => {
    const loadId = ++activeLoadIdRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await fetchComments(deckId, signal)
      if (activeLoadIdRef.current === loadId) setComments(result)
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return
      if (activeLoadIdRef.current === loadId) {
        setError(loadError instanceof Error ? loadError.message : 'Something went wrong.')
      }
    } finally {
      if (activeLoadIdRef.current === loadId) setLoading(false)
    }
  }, [deckId])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  async function postComment() {
    const body = draft.trim()
    if (!body || posting) return

    setPosting(true)
    setPostError(null)
    try {
      const response = await fetch(`/api/decks/${encodeURIComponent(deckId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const payload = (await response.json().catch(() => null)) as {
        error?: string
        comment?: DeckComment
      } | null

      if (!response.ok || !payload?.comment) {
        throw new Error(payload?.error ?? `Could not post comment (${response.status}).`)
      }

      setComments((current) => [...current, payload.comment!])
      setDraft('')
    } catch (submitError) {
      setPostError(submitError instanceof Error ? submitError.message : 'Could not post comment.')
    } finally {
      setPosting(false)
    }
  }

  async function deleteComment(commentId: string) {
    if (deletingId) return

    setDeletingId(commentId)
    try {
      const response = await fetch(
        `/api/decks/${encodeURIComponent(deckId)}/comments/${encodeURIComponent(commentId)}`,
        { method: 'DELETE' },
      )
      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error ?? `Could not delete comment (${response.status}).`)
      }

      setComments((current) => current.filter((comment) => comment.id !== commentId))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete comment.')
    } finally {
      setDeletingId(null)
    }
  }

  const remaining = MAX_COMMENT_LENGTH - draft.length

  return (
    <section className="mt-10 border-t border-stone-200 pt-10 dark:border-stone-800">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Comments</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Share feedback or ask questions about this deck.
          </p>
        </div>
        {!loading ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </p>
        ) : null}
      </div>

      <form
        className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900/40"
        onSubmit={(event) => {
          event.preventDefault()
          void postComment()
        }}
      >
        <Field>
          <Label htmlFor={`deck-comment-${deckId}`}>Add a comment</Label>
          <Textarea
            id={`deck-comment-${deckId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
            placeholder="What did you think of this deck?"
            rows={3}
            disabled={posting}
          />
        </Field>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-stone-500 dark:text-stone-400">{remaining} characters left</p>
          <button
            type="submit"
            disabled={posting || !draft.trim()}
            className="inline-flex rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            {posting ? 'Posting…' : 'Post comment'}
          </button>
        </div>
        {postError ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{postError}</p> : null}
      </form>

      <div className="mt-6 space-y-3">
        {loading ? (
          <>
            <CommentSkeleton />
            <CommentSkeleton />
          </>
        ) : error ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-400">
            {error}
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500"
            >
              Try again
            </button>
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 p-6 text-center dark:border-stone-800 dark:bg-stone-950/40">
            <p className="text-sm text-stone-600 dark:text-stone-400">No comments yet. Be the first to leave one.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-stone-900 dark:text-stone-50">{comment.author_label}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {formatTimeFromNow(comment.created_at, now)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    {comment.body}
                  </p>
                </div>
                {comment.can_delete ? (
                  <button
                    type="button"
                    onClick={() => void deleteComment(comment.id)}
                    disabled={deletingId === comment.id}
                    className="shrink-0 text-xs font-medium text-stone-500 transition hover:text-red-600 disabled:opacity-50 dark:text-stone-400 dark:hover:text-red-400"
                  >
                    {deletingId === comment.id ? 'Deleting…' : 'Delete'}
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
