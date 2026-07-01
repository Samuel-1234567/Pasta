import 'server-only'

import type { User } from '@supabase/supabase-js'
import type { NextResponse } from 'next/server'
import { applyReferralCode, ensureUserProfile } from '@/app/lib/apply-referral'
import { parseOAuthProvider } from '@/app/lib/oauth-profile'
import { normalizeReferralCode, REFERRAL_COOKIE } from '@/app/lib/referral'
import { syncOAuthProfileToDatabase } from '@/app/lib/sync-oauth-profile'

export function safeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard'
  }
  return next
}

export function finalizeAuthResponse(
  response: NextResponse,
  options: {
    activeProvider?: string | null
  } = {},
): NextResponse {
  response.cookies.set('oauth_provider', '', { path: '/', maxAge: 0 })
  response.cookies.set(REFERRAL_COOKIE, '', { path: '/', maxAge: 0 })

  const activeProvider = parseOAuthProvider(options.activeProvider)
  if (activeProvider) {
    response.cookies.set('last_auth_provider', activeProvider, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  return response
}

export function runPostAuthTasks(
  user: User,
  options: {
    activeProvider?: string | null
    referralCode?: string | null
  } = {},
): void {
  void (async () => {
    try {
      await ensureUserProfile(user.id, user.email)
      const activeProvider = parseOAuthProvider(options.activeProvider)
      await syncOAuthProfileToDatabase(user, { activeProvider })
    } catch (error) {
      console.error(
        '[auth] profile sync failed:',
        error instanceof Error ? error.message : error,
      )
    }

    const referralCode = options.referralCode?.trim()
    if (referralCode) {
      try {
        await applyReferralCode(user.id, user.email, normalizeReferralCode(referralCode))
      } catch (error) {
        console.error(
          '[auth] referral apply failed:',
          error instanceof Error ? error.message : error,
        )
      }
    }
  })()
}
