'use client'

import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { type ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  showBack?: boolean
  action?: ReactNode
}

export function PageHeader({ title, showBack = false, action }: PageHeaderProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 min-h-[52px]">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="text-accent text-sm min-w-[44px] min-h-[44px] flex items-center"
            >
              {t.common.back} ←
            </button>
          )}
          <h1 className="text-lg font-bold text-text-primary">{title}</h1>
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
