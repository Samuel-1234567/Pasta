'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { AzureLoginButton } from '@/app/components/azure-login-button'
import { DiscordLoginButton } from '@/app/components/discord-login-button'
import { GitHubLoginButton } from '@/app/components/github-login-button'
import { GoogleLoginButton } from '@/app/components/google-login-button'
import { createSupabaseBrowserClient } from '@/app/lib/supabase/client'

function authCallbackUrl(next = '/dashboard', provider?: 'azure' | 'discord' | 'github' | 'google') {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
  const url = new URL('/auth/callback', appUrl)
  url.searchParams.set('next', next)
  if (provider) url.searchParams.set('provider', provider)
  return url.toString()
}

function decodeQueryError(value: string | null): string | null {
  if (!value) return null
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value
  }
}

const OAUTH_PROVIDER_LABEL: Record<'azure' | 'discord' | 'github' | 'google', string> = {
  azure: 'Azure',
  discord: 'Discord',
  github: 'GitHub',
  google: 'Google',
}

type AuthFormProps = {
  mode: 'signup' | 'login'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/dashboard'
  const queryError = decodeQueryError(searchParams.get('error'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [oauthProvider, setOauthProvider] = useState<'azure' | 'discord' | 'github' | 'google' | null>(
    null,
  )
  const [error, setError] = useState<string | null>(queryError)
  const [message, setMessage] = useState<string | null>(null)

  const isSignup = mode === 'signup'
  const busy = submitting || oauthProvider !== null

  async function signInWithOAuth(provider: Extract<Provider, 'azure' | 'discord' | 'github' | 'google'>) {
    setError(null)
    setMessage(null)
    setOauthProvider(provider)

    try {
      const supabase = createSupabaseBrowserClient()

      // Clear any stale local session so OAuth always runs through the provider.
      await supabase.auth.signOut({ scope: 'local' })

      document.cookie = `oauth_provider=${provider}; path=/; max-age=600; samesite=lax`

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authCallbackUrl(nextPath, provider),
          skipBrowserRedirect: true,
          queryParams:
            provider === 'google'
              ? {
                  prompt: 'select_account',
                }
              : undefined,
        },
      })

      if (oauthError) {
        setError(oauthError.message)
        return
      }

      if (data?.url) {
        window.location.assign(data.url)
        return
      }

      setError(
        `Could not start ${OAUTH_PROVIDER_LABEL[provider]} sign-in. Enable ${OAUTH_PROVIDER_LABEL[provider]} under Supabase → Authentication → Providers and add your redirect URLs.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setOauthProvider(null)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Email is required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createSupabaseBrowserClient()

      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: authCallbackUrl(nextPath),
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          return
        }

        if (data.session) {
          router.replace(nextPath.startsWith('/') ? nextPath : '/dashboard')
          router.refresh()
          return
        }

        setMessage('Check your email for a confirmation link to finish signing up.')
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      router.replace(nextPath.startsWith('/') ? nextPath : '/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          {isSignup
            ? 'Sign up with Google, GitHub, Discord, Azure, or email to save decks and track your study progress.'
            : 'Log in with Google, GitHub, Discord, Azure, or email to pick up where you left off.'}
        </p>

        <div className="mt-8 space-y-3">
          <GoogleLoginButton
            disabled={busy}
            loading={oauthProvider === 'google'}
            onClick={() => void signInWithOAuth('google')}
          />
          <GitHubLoginButton
            disabled={busy}
            loading={oauthProvider === 'github'}
            onClick={() => void signInWithOAuth('github')}
          />
          <DiscordLoginButton
            disabled={busy}
            loading={oauthProvider === 'discord'}
            onClick={() => void signInWithOAuth('discord')}
          />
          <AzureLoginButton
            disabled={busy}
            loading={oauthProvider === 'azure'}
            onClick={() => void signInWithOAuth('azure')}
          />

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              {message}
            </p>
          ) : null}

          <div className="relative pt-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-stone-200 dark:border-stone-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-white px-2 text-stone-500 dark:bg-stone-900/40 dark:text-stone-400">
                Or continue with email
              </span>
            </div>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
            />
          </div>

          {isSignup ? (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-stone-700 dark:text-stone-300"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full justify-center rounded-full bg-amber-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            {submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600 dark:text-stone-400">
          {isSignup ? (
            <>
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-amber-800 hover:underline dark:text-amber-400">
                Log in
              </Link>
            </>
          ) : (
            <>
              New to Pasta?{' '}
              <Link href="/signup" className="font-medium text-amber-800 hover:underline dark:text-amber-400">
                Sign up
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
