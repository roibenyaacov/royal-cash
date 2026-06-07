'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import {
  GroupsNavIcon,
  OddsNavIcon,
  PreflopNavIcon,
  ProfileNavIcon,
} from '@/components/layout/nav-icons'

type NavItem = {
  href: string
  label: string
  icon: ReactNode
  match: (pathname: string) => boolean
}

const items: NavItem[] = [
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

export function BottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

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
