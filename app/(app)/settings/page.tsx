'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Field, FieldGroup, Fieldset, Label } from '@/app/components/ui/fieldset'
import { Input } from '@/app/components/ui/input'
import { useAuth } from '@/app/lib/auth'
import { createSupabaseBrowserClient } from '@/app/lib/supabase/client'

export default function SettingsPage() {
  const { user } = useAuth()
  const email = user?.email ?? ''

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!email) {
      setError('You must be signed in to change your password.')
      return
    }
    if (!currentPassword) {
      setError('Enter your current password.')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createSupabaseBrowserClient()

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })
      if (verifyError) {
        setError('Current password is incorrect.')
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        setError(updateError.message)
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Password updated successfully.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-full bg-stone-50 px-4 py-10 text-stone-900 dark:bg-stone-950 dark:text-stone-100 sm:px-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">Settings</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Manage your account security.</p>

        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
          <Fieldset>
            <form onSubmit={onSubmit}>
              <FieldGroup>
                <Field>
                  <Label>Current password</Label>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <Label>New password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </Field>
                <Field>
                  <Label>Confirm new password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </Field>
              </FieldGroup>

              {error ? (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {error}
                </p>
              ) : null}

              {message ? (
                <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {message}
                </p>
              ) : null}

              <div className="mt-6">
                <Button type="submit" color="amber" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Change password'}
                </Button>
              </div>
            </form>
          </Fieldset>
        </div>
      </div>
    </div>
  )
}
