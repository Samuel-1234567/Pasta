import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

function isMissingProfileColumnError(message: string) {
  return /username|column .* does not exist/i.test(message)
}

export function authorLabelFromProfile(profile: { username?: string | null; email?: string | null }) {
  const username = profile.username?.trim()
  if (username) return username

  if (!profile.email) return 'Community member'
  const local = profile.email.split('@')[0]?.trim()
  return local || 'Community member'
}

export async function loadProfilesById(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  profileIds: string[],
) {
  const profileById = new Map<string, { username?: string | null; email?: string | null }>()
  if (profileIds.length === 0) return profileById

  const { data: profilesWithUsername, error: usernameError } = await supabase
    .from('profiles')
    .select('id, email, username')
    .in('id', profileIds)

  let profiles = profilesWithUsername
  let profilesError = usernameError

  if (profilesError && isMissingProfileColumnError(profilesError.message)) {
    const fallback = await supabase.from('profiles').select('id, email').in('id', profileIds)
    profiles = fallback.data
    profilesError = fallback.error
  }

  if (profilesError) {
    throw new Error(profilesError.message)
  }

  for (const profile of profiles ?? []) {
    const id = profile.id as string
    if (!id) continue
    profileById.set(id, {
      email: (profile as { email?: string | null }).email,
      username: (profile as { username?: string | null }).username,
    })
  }

  return profileById
}
