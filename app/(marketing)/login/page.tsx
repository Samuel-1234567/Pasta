import { Suspense } from 'react'
import { AuthForm } from '@/app/components/auth-form'

export default function LoginPage() {
  return (
    <section className="bg-stone-50 px-4 py-16 dark:bg-stone-950 sm:px-6 sm:py-24">
      <Suspense fallback={<p className="text-center text-sm text-stone-600 dark:text-stone-400">Loading…</p>}>
        <AuthForm mode="login" />
      </Suspense>
    </section>
  )
}
