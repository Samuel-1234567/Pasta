export type UserProfile = {
  id: string
  email: string | null
  phone: string | null
  username: string | null
  avatarUrl: string | null
  lastAuthProvider: string | null
}

export async function fetchUserProfile(signal?: AbortSignal): Promise<UserProfile> {
  const res = await fetch('/api/profile', {
    signal,
    cache: 'no-store',
    credentials: 'same-origin',
  })
  const body = (await res.json().catch(() => null)) as
    | { error?: string; profile?: UserProfile }
    | null

  if (!res.ok) {
    throw new Error(body?.error ?? `Failed to load profile (${res.status}).`)
  }

  if (!body?.profile) {
    throw new Error('Profile not found.')
  }

  return body.profile
}
