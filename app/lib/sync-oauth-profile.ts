import 'server-only'

import type { User } from '@supabase/supabase-js'
import {
  avatarConflictsWithProvider,
  getActiveOAuthProvider,
  oauthProfileFromUser,
  parseOAuthProvider,
  shouldApplyOAuthAvatar,
  shouldApplyOAuthUsername,
  type OAuthProvider,
} from '@/app/lib/oauth-profile'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

type SyncOptions = {
  activeProvider?: OAuthProvider | null
}

async function loadAuthUser(user: User): Promise<User> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.getUserById(user.id)
  if (error || !data.user) return user
  return data.user
}

export async function syncOAuthProfileToDatabase(
  user: User,
  options: SyncOptions = {},
): Promise<void> {
  const authUser = await loadAuthUser(user)
  const supabase = createSupabaseAdminClient()
  const { data: existing, error: loadError } = await supabase
    .from('profiles')
    .select('email, username, avatar_url, last_auth_provider')
    .eq('id', authUser.id)
    .maybeSingle()

  if (
    loadError &&
    !/username|avatar_url|last_auth_provider|column .* does not exist/i.test(loadError.message)
  ) {
    return
  }

  const activeProvider =
    options.activeProvider ??
    parseOAuthProvider(existing?.last_auth_provider) ??
    getActiveOAuthProvider(authUser)

  if (!activeProvider) return

  const oauth = oauthProfileFromUser(authUser, activeProvider)
  const row: {
    id: string
    email?: string | null
    username?: string | null
    avatar_url?: string | null
    last_auth_provider?: string | null
  } = { id: authUser.id, last_auth_provider: activeProvider }

  if (authUser.email) {
    row.email = authUser.email
  } else if (existing?.email) {
    row.email = existing.email
  }

  if (oauth.username && shouldApplyOAuthUsername(existing?.username ?? null, authUser)) {
    row.username = oauth.username
  }

  const currentAvatar = existing?.avatar_url ?? null
  const providerChanged = existing?.last_auth_provider !== activeProvider
  const avatarConflict = avatarConflictsWithProvider(currentAvatar, activeProvider)
  if (
    oauth.avatarUrl &&
    (providerChanged || avatarConflict || shouldApplyOAuthAvatar(currentAvatar, authUser))
  ) {
    row.avatar_url = oauth.avatarUrl
  }

  const hasProfileFields =
    row.username !== undefined ||
    row.avatar_url !== undefined ||
    row.email !== undefined ||
    row.last_auth_provider !== undefined

  if (!hasProfileFields && existing) return

  const { last_auth_provider: _lastAuthProvider, ...rowWithoutProvider } = row
  const { error: upsertError } = await supabase.from('profiles').upsert(row, { onConflict: 'id' })

  if (upsertError && /last_auth_provider|column .* does not exist/i.test(upsertError.message)) {
    await supabase.from('profiles').upsert(rowWithoutProvider, { onConflict: 'id' })
  }
}
