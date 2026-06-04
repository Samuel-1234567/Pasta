const STORAGE_PREFIX = 'pasta.deckPromptHistory:'
const MAX_ITEMS = 15

export function loadDeckPromptHistory(userId: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((p) => String(p ?? '').trim())
      .filter((p) => p.length > 0)
      .slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

/** Saves prompt at the front, deduped; returns the list written to storage. */
export function pushDeckPromptHistory(userId: string, prompt: string): string[] {
  const trimmed = prompt.trim()
  if (!trimmed) return loadDeckPromptHistory(userId)

  const prev = loadDeckPromptHistory(userId).filter((p) => p !== trimmed)
  const next = [trimmed, ...prev].slice(0, MAX_ITEMS)
  try {
    window.localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(next))
  } catch {
    // quota or privacy mode — ignore
  }
  return next
}
