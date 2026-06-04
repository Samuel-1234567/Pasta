export type StudyActivityEvent = {
  type: 'card_reviewed' | 'session_seconds'
  quantity?: number
}

export function recordStudyActivity(
  userId: string,
  deckId: string,
  events: StudyActivityEvent[],
): void {
  if (events.length === 0) return

  void fetch('/api/study-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, deckId, events }),
    keepalive: true,
  }).catch(() => {})
}
