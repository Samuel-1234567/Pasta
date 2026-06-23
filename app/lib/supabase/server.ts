import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Cookie-backed client for authenticated server components and route handlers. */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.')

  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // setAll can fail in Server Components; middleware keeps sessions fresh.
        }
      },
    },
  })
}
