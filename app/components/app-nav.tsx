'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { AvatarButton } from '@/app/components/ui/avatar'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownMenu,
} from '@/app/components/ui/dropdown'
import { useAuth } from '@/app/lib/auth'
import { createSupabaseBrowserClient } from '@/app/lib/supabase/client'
import { resolveProfileAvatar, resolveProfileEmail, resolveProfileName } from '@/app/lib/profile-display'
import { profileInitials } from '@/app/lib/user-display'

const navItems = [
  { href: '/dashboard', label: 'Home', match: (path: string) => path === '/dashboard' },
  {
    href: '/decks',
    label: 'Decks',
    match: (path: string) =>
      path === '/decks' || (path.startsWith('/decks/') && !path.startsWith('/decks/new')),
  },
  {
    href: '/explore',
    label: 'Explore',
    match: (path: string) => path === '/explore' || path.startsWith('/explore/'),
  },
] as const

function isExploreStudyRoute(pathname: string, searchParams: URLSearchParams) {
  return /\/decks\/[^/]+\/study$/.test(pathname) && searchParams.get('from') === 'explore'
}

function navLinkClass(active: boolean) {
  return active
    ? 'inline-flex rounded-full bg-amber-700 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500'
    : 'inline-flex rounded-full border border-stone-300 bg-white/60 px-4 py-2 font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500'
}

function AccountMenu() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const email = resolveProfileEmail(profile, user)
  const username = resolveProfileName(profile, user)
  const avatarUrl = resolveProfileAvatar(profile, user)
  const initials = profileInitials(username, email)

  async function signOut() {
    setSigningOut(true)
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
      router.replace('/login')
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <Dropdown>
      <DropdownButton
        as={AvatarButton}
        src={avatarUrl}
        initials={avatarUrl ? undefined : initials}
        alt={email ? `${email} account menu` : 'Account menu'}
        aria-label="Account menu"
        className="size-9 bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
      />
      <DropdownMenu anchor="bottom end">
        <DropdownItem href="/profile">Profile</DropdownItem>
        <DropdownItem href="/billing">Billing & payments</DropdownItem>
        <DropdownItem href="/settings">Settings</DropdownItem>
        <DropdownDivider />
        <DropdownItem
          onClick={() => void signOut()}
          disabled={signingOut}
          className="text-red-600 data-focus:bg-red-600 data-focus:text-white dark:text-red-400"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

export function AppNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const exploreStudyRoute = isExploreStudyRoute(pathname, searchParams)

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-950/90">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 text-stone-900 transition hover:opacity-90 dark:text-stone-50"
        >
          <div className="grid size-9 place-items-center rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            <span className="text-sm font-semibold">P</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Pasta</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm" aria-label="Main">
          {navItems.map(({ href, label, match }) => {
            let active = match(pathname)
            if (href === '/decks' && exploreStudyRoute) active = false
            if (href === '/explore' && exploreStudyRoute) active = true
            return (
              <Link key={href} href={href} className={navLinkClass(active)} aria-current={active ? 'page' : undefined}>
                {label}
              </Link>
            )
          })}
          <AccountMenu />
        </nav>
      </div>
    </header>
  )
}
