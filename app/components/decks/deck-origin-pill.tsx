import type { DeckOrigin } from '@/app/lib/deck-origin'

const styles: Record<DeckOrigin, string> = {
  yours:
    'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200',
  remix:
    'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200',
}

const labels: Record<DeckOrigin, string> = {
  yours: 'Yours',
  remix: 'Remix',
}

export function DeckOriginPill({ origin }: { origin: DeckOrigin }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles[origin]}`}>
      {labels[origin]}
    </span>
  )
}
