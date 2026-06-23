import { Suspense } from 'react'
import { AppNav } from '@/app/components/app-nav'

function AppNavFallback() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-950/90">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            <span className="text-sm font-semibold">P</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50">Pasta</span>
        </div>
      </div>
    </header>
  )
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col font-sans text-stone-900 dark:text-stone-100">
      <Suspense fallback={<AppNavFallback />}>
        <AppNav />
      </Suspense>
      <div className="flex-1">{children}</div>
    </div>
  )
}
