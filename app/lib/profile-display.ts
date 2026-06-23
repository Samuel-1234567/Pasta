import type { User } from '@supabase/supabase-js'
import {
  avatarMatchesActiveProvider,
  getActiveOAuthProvider,
  isOAuthUser,
  oauthProfileFromUser,
  parseOAuthProvider,
  type OAuthProvider,
} from '@/app/lib/oauth-profile'
import type { UserProfile } from '@/app/lib/profile'

function readLastAuthProviderCookie(): OAuthProvider | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )last_auth_provider=([^;]*)/)
  if (!match?.[1]) return null
  try {
    return parseOAuthProvider(decodeURIComponent(match[1]))
  } catch {
    return parseOAuthProvider(match[1])
  }
}

function resolveActiveProvider(
  profile: Pick<UserProfile, 'lastAuthProvider'> | null,
  user: User | null,
) {
  return (
    parseOAuthProvider(profile?.lastAuthProvider) ??
    readLastAuthProviderCookie() ??
    (user ? getActiveOAuthProvider(user) : null)
  )
}

export function resolveProfileName(
  profile: Pick<UserProfile, 'username' | 'lastAuthProvider'> | null,
  user: User | null,
): string | null {
  if (!user || !isOAuthUser(user)) return profile?.username ?? null

  const provider = resolveActiveProvider(profile, user)
  const oauth = provider ? oauthProfileFromUser(user, provider) : null
  return oauth?.username ?? profile?.username ?? null
}

/** Prefer the active OAuth provider avatar, not a stale linked-provider photo. */
export function resolveProfileAvatar(
  profile: Pick<UserProfile, 'avatarUrl' | 'lastAuthProvider'> | null,
  user: User | null,
): string | null {
  if (!user || !isOAuthUser(user)) return profile?.avatarUrl ?? null

  const provider = resolveActiveProvider(profile, user)
  if (provider) {
    const oauth = oauthProfileFromUser(user, provider)
    if (oauth.avatarUrl && avatarMatchesActiveProvider(user, oauth.avatarUrl, provider)) {
      return oauth.avatarUrl
    }
  }

  const dbAvatar = profile?.avatarUrl ?? null
  if (dbAvatar && !avatarMatchesActiveProvider(user, dbAvatar, provider)) {
    return null
  }

  return dbAvatar
}

export function resolveProfileEmail(
  profile: Pick<UserProfile, 'email'> | null,
  user: User | null,
): string {
  return profile?.email ?? user?.email ?? ''
}
