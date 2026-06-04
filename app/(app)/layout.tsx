import { AppNav } from '@/app/components/app-nav'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col font-sans text-stone-900 dark:text-stone-100">
      <AppNav />
      <div className="flex-1">{children}</div>
    </div>
  )
}
