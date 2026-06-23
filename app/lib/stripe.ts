import 'server-only'

import Stripe from 'stripe'

/** Preview API version required for Managed Payments checkout. */
export const STRIPE_MANAGED_PAYMENTS_API_VERSION = '2026-02-25.preview' as const

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY.')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey)
  }

  return stripeClient
}
