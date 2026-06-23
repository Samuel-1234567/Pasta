import type { Provider, User } from '@supabase/supabase-js'

type OAuthMetadata = Record<string, unknown>
export type OAuthProvider = Extract<Provider, 'azure' | 'discord' | 'github' | 'google'>

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function identityData(user: User, provider: OAuthProvider): OAuthMetadata | null {
  const identity = user.identities?.find((entry) => entry.provider === provider)
  if (identity?.identity_data && typeof identity.identity_data === 'object') {
    return identity.identity_data as OAuthMetadata
  }
  return null
}

function hasProvider(user: User, provider: OAuthProvider): boolean {
  if (user.app_metadata?.provider === provider) return true
  const providers = user.app_metadata?.providers
  if (Array.isArray(providers) && providers.includes(provider)) return true
  return user.identities?.some((identity) => identity.provider === provider) ?? false
}

export function isDiscordUser(user: User): boolean {
  return hasProvider(user, 'discord')
}

export function isGoogleUser(user: User): boolean {
  return hasProvider(user, 'google')
}

export function isGitHubUser(user: User): boolean {
  return hasProvider(user, 'github')
}

export function isAzureUser(user: User): boolean {
  return hasProvider(user, 'azure')
}

export function isOAuthUser(user: User): boolean {
  return isDiscordUser(user) || isGoogleUser(user) || isGitHubUser(user) || isAzureUser(user)
}

/** Provider used for the most recent sign-in (not the account creation provider). */
export function getActiveOAuthProvider(user: User): OAuthProvider | null {
  const oauthIdentities =
    user.identities?.filter(
      (identity): identity is (typeof identity) & { provider: OAuthProvider } =>
        identity.provider === 'azure' ||
        identity.provider === 'github' ||
        identity.provider === 'google' ||
        identity.provider === 'discord',
    ) ?? []

  if (oauthIdentities.length === 0) {
    const provider = user.app_metadata?.provider
    return provider === 'azure' ||
      provider === 'github' ||
      provider === 'google' ||
      provider === 'discord'
      ? provider
      : null
  }

  if (oauthIdentities.length === 1) return oauthIdentities[0].provider

  const withSignIn = oauthIdentities.filter((identity) => identity.last_sign_in_at)
  if (withSignIn.length > 0) {
    const mostRecent = [...withSignIn].sort(
      (a, b) => Date.parse(b.last_sign_in_at!) - Date.parse(a.last_sign_in_at!),
    )[0]
    if (mostRecent) return mostRecent.provider
  }

  const provider = user.app_metadata?.provider
  if (
    provider === 'azure' ||
    provider === 'github' ||
    provider === 'google' ||
    provider === 'discord'
  ) {
    return provider
  }

  return oauthIdentities[0]?.provider ?? null
}

export function parseOAuthProvider(value: string | null | undefined): OAuthProvider | null {
  return value === 'azure' || value === 'github' || value === 'google' || value === 'discord'
    ? value
    : null
}

function readGoogleName(meta: OAuthMetadata, identity: OAuthMetadata | null): string | null {
  return (
    readString(identity?.full_name) ??
    readString(identity?.name) ??
    readString(identity?.given_name) ??
    readString(meta.full_name) ??
    readString(meta.name) ??
    readString(meta.given_name)
  )
}

function readDiscordName(meta: OAuthMetadata, identity: OAuthMetadata | null): string | null {
  return (
    readString(identity?.full_name) ??
    readString(identity?.name) ??
    readString(identity?.user_name) ??
    readString(identity?.preferred_username) ??
    readString(meta.full_name) ??
    readString(meta.name) ??
    readString(meta.user_name) ??
    readString(meta.preferred_username) ??
    readString(
      identity?.custom_claims && typeof identity.custom_claims === 'object'
        ? (identity.custom_claims as OAuthMetadata).global_name
        : null,
    ) ??
    readString(
      meta.custom_claims && typeof meta.custom_claims === 'object'
        ? (meta.custom_claims as OAuthMetadata).global_name
        : null,
    )
  )
}

function normalizeGooglePictureUrl(url: string): string {
  if (!/googleusercontent\.com|ggpht\.com/i.test(url)) return url
  return url.replace(/=s(\d+)(-c)?$/, '=s256$2')
}

function isGoogleAvatarUrl(url: string): boolean {
  return /googleusercontent\.com|ggpht\.com/i.test(url)
}

function isDiscordAvatarUrl(url: string): boolean {
  return /cdn\.discordapp\.com|discord/i.test(url)
}

function isGitHubAvatarUrl(url: string): boolean {
  return /avatars\.githubusercontent\.com/i.test(url)
}

function isAzureAvatarUrl(url: string): boolean {
  return /graph\.microsoft\.com|microsoftusercontent\.com/i.test(url)
}

function isOtherOAuthAvatarUrl(url: string, provider: OAuthProvider): boolean {
  if (provider === 'google') {
    return isDiscordAvatarUrl(url) || isGitHubAvatarUrl(url) || isAzureAvatarUrl(url)
  }
  if (provider === 'discord') {
    return isGoogleAvatarUrl(url) || isGitHubAvatarUrl(url) || isAzureAvatarUrl(url)
  }
  if (provider === 'github') {
    return isGoogleAvatarUrl(url) || isDiscordAvatarUrl(url) || isAzureAvatarUrl(url)
  }
  if (provider === 'azure') {
    return isGoogleAvatarUrl(url) || isDiscordAvatarUrl(url) || isGitHubAvatarUrl(url)
  }
  return false
}

export function avatarConflictsWithProvider(
  avatarUrl: string | null,
  provider: OAuthProvider,
): boolean {
  if (!avatarUrl || avatarUrl.startsWith('/api/profile-avatars/')) return false
  return isOtherOAuthAvatarUrl(avatarUrl, provider)
}

function readGoogleAvatar(meta: OAuthMetadata, identity: OAuthMetadata | null): string | null {
  const candidates = [
    readString(identity?.picture),
    readString(identity?.avatar_url),
    readString(meta.picture),
    readString(meta.avatar_url),
  ]

  const raw = candidates.find((url) => url && isGoogleAvatarUrl(url))
  return raw ? normalizeGooglePictureUrl(raw) : null
}

function readDiscordAvatar(meta: OAuthMetadata, identity: OAuthMetadata | null): string | null {
  const identityAvatar = readString(identity?.avatar_url)
  const metaAvatar = readString(meta.avatar_url)
  let avatarUrl =
    (identityAvatar && isDiscordAvatarUrl(identityAvatar) ? identityAvatar : null) ??
    (metaAvatar && isDiscordAvatarUrl(metaAvatar) ? metaAvatar : null)

  if (!avatarUrl) {
    const avatarHash = readString(identity?.avatar) ?? readString(meta.avatar)
    const providerId =
      readString(identity?.provider_id) ??
      readString(identity?.sub) ??
      readString(meta.provider_id) ??
      readString(meta.sub)
    if (avatarHash && providerId) {
      avatarUrl = `https://cdn.discordapp.com/avatars/${providerId}/${avatarHash}.png`
    }
  }

  return avatarUrl
}

export function discordProfileFromUser(user: User): {
  username: string | null
  avatarUrl: string | null
} {
  const meta = (user.user_metadata ?? {}) as OAuthMetadata
  const identity = identityData(user, 'discord')

  return {
    username: readDiscordName(meta, identity),
    avatarUrl: readDiscordAvatar(meta, identity),
  }
}

export function googleProfileFromUser(user: User): {
  username: string | null
  avatarUrl: string | null
} {
  const meta = (user.user_metadata ?? {}) as OAuthMetadata
  const identity = identityData(user, 'google')

  return {
    username: readGoogleName(meta, identity),
    avatarUrl: readGoogleAvatar(meta, identity),
  }
}

function readGitHubName(meta: OAuthMetadata, identity: OAuthMetadata | null): string | null {
  return (
    readString(identity?.full_name) ??
    readString(identity?.name) ??
    readString(identity?.user_name) ??
    readString(identity?.preferred_username) ??
    readString(identity?.login) ??
    readString(meta.full_name) ??
    readString(meta.name) ??
    readString(meta.user_name) ??
    readString(meta.preferred_username) ??
    readString(meta.login)
  )
}

function readGitHubAvatar(meta: OAuthMetadata, identity: OAuthMetadata | null): string | null {
  const candidates = [
    readString(identity?.avatar_url),
    readString(identity?.picture),
    readString(meta.avatar_url),
    readString(meta.picture),
  ]

  return candidates.find((url) => url && isGitHubAvatarUrl(url)) ?? null
}

export function githubProfileFromUser(user: User): {
  username: string | null
  avatarUrl: string | null
} {
  const meta = (user.user_metadata ?? {}) as OAuthMetadata
  const identity = identityData(user, 'github')

  return {
    username: readGitHubName(meta, identity),
    avatarUrl: readGitHubAvatar(meta, identity),
  }
}

function readAzureName(meta: OAuthMetadata, identity: OAuthMetadata | null): string | null {
  const given =
    readString(identity?.given_name) ??
    readString(identity?.givenName) ??
    readString(meta.given_name) ??
    readString(meta.givenName)
  const family =
    readString(identity?.family_name) ??
    readString(identity?.surname) ??
    readString(meta.family_name) ??
    readString(meta.surname)

  return (
    readString(identity?.full_name) ??
    readString(identity?.name) ??
    readString(identity?.displayName) ??
    readString(identity?.preferred_username) ??
    readString(identity?.userPrincipalName) ??
    (given && family ? `${given} ${family}` : given ?? family) ??
    readString(meta.full_name) ??
    readString(meta.name) ??
    readString(meta.displayName) ??
    readString(meta.preferred_username) ??
    readString(meta.userPrincipalName)
  )
}

function readAzureAvatar(meta: OAuthMetadata, identity: OAuthMetadata | null): string | null {
  const candidates = [
    readString(identity?.picture),
    readString(identity?.avatar_url),
    readString(meta.picture),
    readString(meta.avatar_url),
  ]

  return candidates.find((url) => url && isAzureAvatarUrl(url)) ?? null
}

export function azureProfileFromUser(user: User): {
  username: string | null
  avatarUrl: string | null
} {
  const meta = (user.user_metadata ?? {}) as OAuthMetadata
  const identity = identityData(user, 'azure')

  return {
    username: readAzureName(meta, identity),
    avatarUrl: readAzureAvatar(meta, identity),
  }
}

export function oauthProfileFromUser(
  user: User,
  activeProvider?: OAuthProvider | null,
): {
  username: string | null
  avatarUrl: string | null
} {
  const provider = activeProvider ?? getActiveOAuthProvider(user)
  if (provider === 'google') return googleProfileFromUser(user)
  if (provider === 'discord') return discordProfileFromUser(user)
  if (provider === 'github') return githubProfileFromUser(user)
  if (provider === 'azure') return azureProfileFromUser(user)
  return { username: null, avatarUrl: null }
}

export function getOAuthProvider(user: User): OAuthProvider | null {
  return getActiveOAuthProvider(user)
}

export function avatarMatchesActiveProvider(
  user: User,
  avatarUrl: string,
  activeProvider?: OAuthProvider | null,
): boolean {
  if (avatarUrl.startsWith('/api/profile-avatars/')) return true

  const provider = activeProvider ?? getActiveOAuthProvider(user)
  if (provider === 'google') return isGoogleAvatarUrl(avatarUrl)
  if (provider === 'discord') return isDiscordAvatarUrl(avatarUrl)
  if (provider === 'github') return isGitHubAvatarUrl(avatarUrl)
  if (provider === 'azure') return isAzureAvatarUrl(avatarUrl)
  return true
}

/** Keep custom uploads; always refresh OAuth avatars for OAuth users otherwise. */
export function shouldApplyOAuthAvatar(currentAvatarUrl: string | null, user: User): boolean {
  if (!currentAvatarUrl) return true
  if (currentAvatarUrl.startsWith('/api/profile-avatars/')) return false
  return getActiveOAuthProvider(user) !== null
}

export function shouldApplyOAuthUsername(currentUsername: string | null, user: User): boolean {
  if (!currentUsername) return true
  return getActiveOAuthProvider(user) !== null
}
