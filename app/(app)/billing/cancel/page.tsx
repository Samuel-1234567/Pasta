import Link from 'next/link'
import { CheckoutButton } from '@/app/components/billing/checkout-button'

export default function BillingCancelPage() {
  return (
    <div className="min-h-full bg-stone-50 px-4 py-16 text-stone-900 dark:bg-stone-950 dark:text-stone-100 sm:px-6">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Checkout canceled
        </h1>
        <p className="mt-4 text-stone-600 dark:text-stone-400">
          No charge was made. You can return to pricing and try again whenever you are ready.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <CheckoutButton
            loginNext="/billing/cancel"
            className="inline-flex rounded-full bg-amber-700 px-6 py-3 text-sm font-medium text-white shadow transition hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Try checkout again
          </CheckoutButton>
          <Link
            href="/pricing"
            className="inline-flex rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-800 transition hover:border-stone-400 dark:border-stone-600 dark:text-stone-100"
          >
            Back to pricing
          </Link>
        </div>
      </div>
    </div>
  )
}
