'use client'

export { AuthProvider, useAuth, useCurrentUserId } from '@/app/components/auth-provider'

/**
 * @deprecated Use `useCurrentUserId()` in client components instead.
 */
export function getCurrentUserId(): never {
  throw new Error('getCurrentUserId() is deprecated. Use useCurrentUserId() from @/app/lib/auth.')
}
