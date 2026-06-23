import { Suspense } from 'react'
import { BillingSuccessContent } from './billing-success-content'

function BillingSuccessFallback() {
  return (
    <div className="min-h-full bg-stone-50 px-4 py-16 text-stone-900 dark:bg-stone-950 dark:text-stone-100 sm:px-6">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
      </div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<BillingSuccessFallback />}>
      <BillingSuccessContent />
    </Suspense>
  )
}
