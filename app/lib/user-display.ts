export function initialsFromEmail(email: string | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export function initialsFromUsername(username: string | undefined | null): string | null {
  if (!username) return null
  const cleaned = username.replace(/[^a-zA-Z0-9]/g, '')
  if (cleaned.length >= 2) return cleaned.slice(0, 2).toUpperCase()
  if (cleaned.length === 1) return cleaned.toUpperCase()
  return username.slice(0, 2).toUpperCase()
}

export function profileInitials(
  username: string | null | undefined,
  email: string | undefined,
): string {
  return initialsFromUsername(username) ?? initialsFromEmail(email)
}
