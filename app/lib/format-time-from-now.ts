export function formatTimeFromNow(iso: string | null, nowMs = Date.now()): string {
  if (!iso) return 'never'
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return '—'

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const diffSec = Math.round((ms - nowMs) / 1000)
  const absSec = Math.abs(diffSec)

  if (absSec < 45) return 'just now'

  const diffMin = Math.round(diffSec / 60)
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')

  const diffHour = Math.round(diffMin / 60)
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour')

  const diffDay = Math.round(diffHour / 24)
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day')

  const diffMonth = Math.round(diffDay / 30)
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, 'month')

  return rtf.format(Math.round(diffMonth / 12), 'year')
}
