'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/lib/i18n/locale-context'
import {
  GroupsNavIcon,
  OddsNavIcon,
  PreflopNavIcon,
  ProfileNavIcon,
} from '@/components/layout/nav-icons'

export function BottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const { t } = useLocale()

  // Mark mounted after hydration so the active-link highlight only renders
  // once usePathname() is reliable on the client. Setting state once on
  // mount is the standard hydration-guard pattern.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  const items: {
    href: string
    label: string
    icon: ReactNode
    match: (pathname: string) => boolean
  }[] = [
    {
      href: '/groups',
      label: t.groups.myGroups,
      icon: <GroupsNavIcon />,
      match: (p) => p.startsWith('/groups'),
    },
    {
      href: '/tools/odds',
      label: t.tools.oddsNav,
      icon: <OddsNavIcon />,
      match: (p) => p.startsWith('/tools/odds'),
    },
    {
      href: '/tools/preflop',
      label: t.tools.preflopNav,
      icon: <PreflopNavIcon />,
      match: (p) => p.startsWith('/tools/preflop'),
    },
    {
      href: '/profile',
      label: t.profile.title,
      icon: <ProfileNavIcon />,
      match: (p) => p.startsWith('/profile'),
    },
  ]

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-surface border-t border-border
        flex items-stretch safe-bottom z-40"
    >
      {items.map((item) => {
        const active = mounted && item.match(pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex-1 flex flex-col items-center justify-center gap-1
              py-2 px-1 min-h-[52px] min-w-0 transition-colors text-[11px]
              ${active ? 'text-accent' : 'text-text-muted'}
            `}
          >
            {item.icon}
            <span className="truncate max-w-full">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
