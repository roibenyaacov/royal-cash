'use client'

import { type ButtonHTMLAttributes } from 'react'
import { useLocale } from '@/lib/i18n/locale-context'
import { ChevronBack } from '@/components/ui/chevron'

type BackButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function BackButton({ className = '', ...props }: BackButtonProps) {
  const { t, dir } = useLocale()

  return (
    <button
      type="button"
      className={`
        inline-flex items-center gap-0.5
        text-accent text-[17px] leading-none font-normal
        min-h-[44px] px-1 -ms-1
        active:opacity-50 transition-opacity
        ${className}
      `}
      {...props}
    >
      <ChevronBack className={dir === 'ltr' ? 'scale-x-[-1]' : ''} />
      <span>{t.common.back}</span>
    </button>
  )
}
