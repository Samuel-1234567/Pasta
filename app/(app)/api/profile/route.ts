import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { requireUser } from '@/app/lib/supabase/require-user'
import { syncOAuthProfileToDatabase } from '@/app/lib/sync-oauth-profile'

export const dynamic = 'force-dynamic'

type ProfileRow = {
  id: string
  email: string | null
  phone: string | null
  username: string | null
  avatar_url: string | null
  last_auth_provider: string | null
}

function mapProfileRow(row: ProfileRow) {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    username: row.username,
    avatarUrl: row.avatar_url,
    lastAuthProvider: row.last_auth_provider,
  }
}

function isMissingOptionalProfileColumn(errorMessage: string): boolean {
  return /username|avatar_url|last_auth_provider|column .* does not exist/i.test(errorMessage)
}

async function fetchProfileRow(userId: string): Promise<{ row: ProfileRow | null; error: string | null }> {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, phone, username, avatar_url, last_auth_provider')
    .eq('id', userId)
    .maybeSingle()

  if (!error) {
    return { row: data as ProfileRow | null, error: null }
  }

  if (!isMissingOptionalProfileColumn(error.message)) {
    return { row: null, error: error.message }
  }

  const { data: basic, error: basicError } = await supabase
    .from('profiles')
    .select('id, email, phone')
    .eq('id', userId)
    .maybeSingle()

  if (basicError) {
    return { row: null, error: basicError.message }
  }

  if (!basic) {
    return { row: null, error: null }
  }

  return {
    row: {
      id: basic.id,
      email: basic.email,
      phone: basic.phone,
      username: null,
      avatar_url: null,
      last_auth_provider: null,
    },
    error: null,
  }
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    await syncOAuthProfileToDatabase(auth.user)
  } catch (error) {
    console.error(
      '[profile] OAuth sync failed:',
      error instanceof Error ? error.message : error,
    )
  }

  const { row, error } = await fetchProfileRow(auth.user.id)

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  if (!row) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
  }

  return NextResponse.json(
    { profile: mapProfileRow(row) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
