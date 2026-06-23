/**
 * Creates the Basic subscription product in Stripe (Managed Payments eligible tax code).
 *
 * Usage:
 *   npm run stripe:create-product
 *
 * Requires STRIPE_SECRET_KEY in .env.local (from Stripe Dashboard → Developers → API keys).
 */
import Stripe from 'stripe'

const STRIPE_MANAGED_PAYMENTS_API_VERSION = '2026-02-25.preview'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('Missing STRIPE_SECRET_KEY. Add it to .env.local from the Stripe Dashboard.')
  process.exit(1)
}

const stripe = new Stripe(secretKey)

const product = await stripe.products.create(
  {
    name: 'Basic subscription',
    description: 'A basic subscription to our service',
    tax_code: 'txcd_10103100',
    default_price_data: {
      unit_amount: 499,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
    },
  },
  {
    apiVersion: STRIPE_MANAGED_PAYMENTS_API_VERSION,
  },
)

const priceId =
  typeof product.default_price === 'string' ? product.default_price : product.default_price?.id

console.log('Created Stripe product:', product.id)
console.log('Default price ID:', priceId)
console.log('')
console.log('Add to .env.local:')
console.log(`STRIPE_SUBSCRIPTION_PRICE_ID=${priceId}`)
