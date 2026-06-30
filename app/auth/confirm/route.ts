import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { completeAuthRedirect, safeRedirectPath } from '@/app/lib/auth-callback'
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
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = safeRedirectPath(searchParams.get('next'))
  const cookieStore = await cookies()
  const referralCode = cookieStore.get(REFERRAL_COOKIE)?.value ?? null

  if (!tokenHash || !type || !OTP_TYPES.has(type as EmailOtpType)) {
    return authErrorRedirect(origin, 'Invalid or expired confirmation link.')
  }

  const { supabase, applyCookies } = createSupabaseRouteHandlerClient(request)
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  })

  if (error || !data.user) {
    console.error('[auth/confirm]', error?.message ?? 'verifyOtp returned no user')
    return authErrorRedirect(origin, error?.message ?? 'Could not confirm your email. Please try again.')
  }

  let response = NextResponse.redirect(`${origin}${next}`)
  response = applyCookies(response)
  return completeAuthRedirect(data.user, response, { referralCode })
}
