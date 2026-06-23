import 'server-only'

import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'

type RequireUserResult =
  | { user: User; error: null }
  | { user: null; error: string }

export async function requireUser(): Promise<RequireUserResult> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, error: 'Unauthorized.' }
  }

  return { user, error: null }
}
