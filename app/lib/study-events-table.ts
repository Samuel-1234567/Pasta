const MISSING_TABLE_PATTERN = /study_events/i

export function isStudyEventsTableMissing(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code === 'PGRST205') return true
  return MISSING_TABLE_PATTERN.test(error.message ?? '')
}

export const EMPTY_STUDY_STATS = {
  studyMinutesToday: 0,
  cardsReviewedToday: 0,
  streakDays: 0,
} as const
