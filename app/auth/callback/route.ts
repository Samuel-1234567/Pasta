import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseOAuthProvider } from '@/app/lib/oauth-profile'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { syncOAuthProfileToDatabase } from '@/app/lib/sync-oauth-profile'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const cookieStore = await cookies()
  const activeProvider =
    parseOAuthProvider(searchParams.get('provider')) ??
    parseOAuthProvider(cookieStore.get('oauth_provider')?.value)
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error')

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      await syncOAuthProfileToDatabase(data.user, { activeProvider })
      const response = NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/dashboard'}`)
      response.cookies.set('oauth_provider', '', { path: '/', maxAge: 0 })
      if (activeProvider) {
        response.cookies.set('last_auth_provider', activeProvider, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
          sameSite: 'lax',
        })
      }
      return response
    }
  }

  const message = oauthError ?? 'Could not sign in. Please try again.'
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`)
}
