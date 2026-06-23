'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { fetchUserProfile, type UserProfile } from '@/app/lib/profile'
import { createSupabaseBrowserClient } from '@/app/lib/supabase/client'

type AuthContextValue = {
  user: User | null
  loading: boolean
  profile: UserProfile | null
  profileLoading: boolean
  refreshProfile: (options?: { silent?: boolean }) => Promise<void>
  patchProfile: (patch: Partial<UserProfile>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function readAuthenticatedUser(): Promise<User | null> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const patchProfile = useCallback(
    (patch: Partial<UserProfile>) => {
      setProfile((prev) => {
        if (prev) return { ...prev, ...patch }
        if (!user) return prev
        return {
          id: user.id,
          email: user.email ?? null,
          phone: null,
          username: null,
          avatarUrl: null,
          lastAuthProvider: null,
          ...patch,
        }
      })
    },
    [user],
  )

  const refreshProfile = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setProfile(null)
      return
    }

    if (!options?.silent) {
      setProfileLoading(true)
    }
    try {
      const nextProfile = await fetchUserProfile()
      setProfile(nextProfile)
    } catch {
      // Keep the existing profile if refresh fails.
    } finally {
      if (!options?.silent) {
        setProfileLoading(false)
      }
    }
  }, [user])

  useEffect(() => {
    void readAuthenticatedUser().then((nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })

    const supabase = createSupabaseBrowserClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (!session) {
          setUser(null)
          setLoading(false)
          return
        }

        const nextUser = await readAuthenticatedUser()
        setUser(nextUser ?? session.user)
        setLoading(false)
      })()
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const value = useMemo(
    () => ({ user, loading, profile, profileLoading, refreshProfile, patchProfile }),
    [loading, patchProfile, profile, profileLoading, refreshProfile, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }
  return context
}

export function useCurrentUserId(): string | null {
  const { user, loading } = useAuth()
  if (loading) return null
  return user?.id ?? null
}
