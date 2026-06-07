'use client'

import { useRouter } from 'next/navigation'
import { type ReactNode } from 'react'
import { BackButton } from '@/components/ui/back-button'

type PageHeaderProps = {
  title: string
  showBack?: boolean
  action?: ReactNode
}

export function PageHeader({ title, showBack = false, action }: PageHeaderProps) {
  const router = useRouter()

  return (
    <header className="sticky top-11 z-30 bg-bg/90 backdrop-blur-xl border-b border-border/80">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-2 min-h-[44px] gap-1">
        <div className="flex items-center justify-self-start min-w-0">
          {showBack ? (
            <BackButton onClick={() => router.back()} />
          ) : null}
        </div>

        <h1 className="text-[17px] font-semibold text-text-primary truncate max-w-[min(220px,42vw)] text-center leading-tight px-1">
          {title}
        </h1>

        <div className="flex items-center justify-self-end min-w-0">
          {action ?? null}
        </div>
      </div>
    </header>
  )
}
