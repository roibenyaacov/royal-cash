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
      <div className="relative flex items-center justify-center px-4 min-h-[44px]">
        {showBack && (
          <BackButton
            onClick={() => router.back()}
            className="absolute top-0 bottom-0 inset-inline-start-4 flex items-center"
          />
        )}
        {action && (
          <div className="absolute top-0 bottom-0 inset-inline-end-4 flex items-center">
            {action}
          </div>
        )}
        <h1 className="text-[17px] font-semibold text-text-primary truncate max-w-[52%] text-center leading-tight">
          {title}
        </h1>
      </div>
    </header>
  )
}
