import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { completeAuthRedirect, safeRedirectPath } from '@/app/lib/auth-callback'
import { parseOAuthProvider } from '@/app/lib/oauth-profile'
import { REFERRAL_COOKIE } from '@/app/lib/referral'
import { createSupabaseRouteHandlerClient } from '@/app/lib/supabase/route-handler'

const OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email',
  'email_change',
])

function authErrorRedirect(origin: string, message: string) {
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = safeRedirectPath(searchParams.get('next'))
  const cookieStore = await cookies()
  const activeProvider =
    parseOAuthProvider(searchParams.get('provider')) ??
    parseOAuthProvider(cookieStore.get('oauth_provider')?.value)
  const referralCode = cookieStore.get(REFERRAL_COOKIE)?.value ?? null
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error')

  if (oauthError) {
    return authErrorRedirect(origin, oauthError)
  }

  const { supabase, applyCookies } = createSupabaseRouteHandlerClient(request)

  if (tokenHash && type && OTP_TYPES.has(type as EmailOtpType)) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })

    if (!error && data.user) {
      let response = NextResponse.redirect(`${origin}${next}`)
      response = applyCookies(response)
      return completeAuthRedirect(data.user, response, { activeProvider, referralCode })
    }

    console.error('[auth/callback] verifyOtp failed:', error?.message)
    return authErrorRedirect(origin, error?.message ?? 'Could not confirm your email. Please try again.')
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      let response = NextResponse.redirect(`${origin}${next}`)
      response = applyCookies(response)
      return completeAuthRedirect(data.user, response, { activeProvider, referralCode })
    }

    console.error('[auth/callback] exchangeCodeForSession failed:', error?.message)
    return authErrorRedirect(
      origin,
      error?.message ?? 'Could not sign in. Please try again.',
    )
  }

  return authErrorRedirect(origin, 'Invalid or expired sign-in link.')
}
