import 'server-only'

import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

type RouteHandlerClient = {
  supabase: ReturnType<typeof createServerClient>
}

export function createSupabaseRouteHandlerClient(
  request: NextRequest,
  response: NextResponse,
): RouteHandlerClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.')

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  return { supabase }
}
