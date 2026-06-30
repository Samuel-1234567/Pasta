import 'server-only'

import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

type StoredCookie = {
  name: string
  value: string
  options?: Parameters<NextResponse['cookies']['set']>[2]
}

type RouteHandlerClient = {
  supabase: ReturnType<typeof createServerClient>
  applyCookies: (response: NextResponse) => NextResponse
}

export function createSupabaseRouteHandlerClient(request: NextRequest): RouteHandlerClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.')

  const storedCookies: StoredCookie[] = []

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value)
          storedCookies.push({ name, value, options })
        }
      },
    },
  })

  return {
    supabase,
    applyCookies(nextResponse: NextResponse) {
      for (const cookie of storedCookies) {
        nextResponse.cookies.set(cookie.name, cookie.value, cookie.options)
      }
      return nextResponse
    },
  }
}
