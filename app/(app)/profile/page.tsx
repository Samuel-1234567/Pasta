'use client'

import { useRef, useState } from 'react'
import { Avatar } from '@/app/components/ui/avatar'
import { Button } from '@/app/components/ui/button'
import { useAuth } from '@/app/lib/auth'
import { resolveProfileAvatar, resolveProfileEmail, resolveProfileName } from '@/app/lib/profile-display'
import { profileInitials } from '@/app/lib/user-display'

export default function ProfilePage() {
  const { user, loading, profile, profileLoading, refreshProfile, patchProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadOk, setUploadOk] = useState(false)

  const email = resolveProfileEmail(profile, user)
  const username = resolveProfileName(profile, user)
  const avatarUrl = resolveProfileAvatar(profile, user)
  const initials = profileInitials(username, email)
  const busy = loading || (profileLoading && !profile)

  async function onFileSelected(file: File | undefined) {
    if (!file) return

    setUploading(true)
    setUploadError(null)
    setUploadOk(false)

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/profile/avatar', { method: 'POST', body: form, credentials: 'same-origin' })
      const body = (await res.json().catch(() => null)) as { error?: string; avatarUrl?: string } | null

      if (!res.ok) {
        throw new Error(body?.error ?? `Upload failed (${res.status}).`)
      }

      if (body?.avatarUrl) {
        patchProfile({ avatarUrl: body.avatarUrl })
      }

      await refreshProfile({ silent: true })
      setUploadOk(true)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-full bg-stone-50 px-4 py-10 text-stone-900 dark:bg-stone-950 dark:text-stone-100 sm:px-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">Profile</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Your Pasta account details.</p>

        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
          {busy ? (
            <p className="text-sm text-stone-600 dark:text-stone-400">Loading…</p>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <Avatar
                  src={avatarUrl}
                  initials={avatarUrl ? undefined : initials}
                  alt={username ?? email ? `${username ?? email} profile picture` : 'Profile picture'}
                  className="size-24 bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                />
                <div className="flex flex-col items-center gap-3 sm:items-start">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => void onFileSelected(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    color="amber"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? 'Uploading…' : 'Upload picture'}
                  </Button>
                  <p className="text-center text-xs text-stone-500 dark:text-stone-400 sm:text-left">
                    JPEG, PNG, WebP, or GIF · max 3 MB
                  </p>
                </div>
              </div>

              {uploadError ? (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {uploadError}
                </p>
              ) : null}

              {uploadOk ? (
                <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                  Profile picture updated.
                </p>
              ) : null}

              <dl className="mt-8 space-y-4 border-t border-stone-200 pt-6 text-sm dark:border-stone-800">
                {username ? (
                  <div>
                    <dt className="font-medium text-stone-500 dark:text-stone-400">Name</dt>
                    <dd className="mt-1 text-stone-900 dark:text-stone-100">{username}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-medium text-stone-500 dark:text-stone-400">Email</dt>
                  <dd className="mt-1 text-stone-900 dark:text-stone-100">{email || '—'}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
