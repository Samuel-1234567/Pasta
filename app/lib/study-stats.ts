export type StudyStats = {
  studyMinutesToday: number
  cardsReviewedToday: number
  streakDays: number
}

export function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function computeStreakDays(activeDayKeys: Set<string>, today = new Date()): number {
  let streak = 0
  const cursor = startOfUtcDay(today)

  while (activeDayKeys.has(utcDateKey(cursor))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return streak
}

export function aggregateStudyEvents(
  rows: Array<{ event_type: string; quantity: number; occurred_at: string }>,
  todayStartMs: number,
): { cardsReviewedToday: number; studySecondsToday: number; activeDayKeys: Set<string> } {
  let cardsReviewedToday = 0
  let studySecondsToday = 0
  const activeDayKeys = new Set<string>()

  for (const row of rows) {
    const occurredAt = Date.parse(row.occurred_at)
    if (Number.isNaN(occurredAt)) continue

    activeDayKeys.add(utcDateKey(new Date(occurredAt)))

    if (occurredAt < todayStartMs) continue

    const qty = row.quantity ?? 0
    if (row.event_type === 'card_reviewed') cardsReviewedToday += qty
    else if (row.event_type === 'session_seconds') studySecondsToday += qty
  }

  return { cardsReviewedToday, studySecondsToday, activeDayKeys }
}

export function formatStudyMinutes(minutes: number): string {
  if (minutes <= 0) return '0 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem === 0 ? `${hours} hr` : `${hours} hr ${rem} min`
}

export function formatStudyDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  if (seconds <= 0) return '0 sec'
  if (seconds < 60) return `${seconds} sec`
  const minutes = Math.floor(seconds / 60)
  const remSeconds = seconds % 60
  if (minutes < 60) {
    return remSeconds === 0 ? `${minutes} min` : `${minutes} min ${remSeconds} sec`
  }
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  if (remMinutes === 0) return `${hours} hr`
  return `${hours} hr ${remMinutes} min`
}

export function formatCardsReviewed(count: number): string {
  if (count === 1) return '1 card'
  return `${count} cards`
}

export function formatStreakDays(days: number): string {
  if (days === 1) return '1 day'
  return `${days} days`
}

export function streakHint(days: number): string {
  if (days === 0) return 'study today to start'
  if (days === 1) return 'keep it going'
  return 'keep it warm'
}
