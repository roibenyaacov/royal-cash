'use client'

import { type ReactNode } from 'react'
import { LocaleProvider } from '@/lib/i18n/locale-context'
import { AppBrandBar } from '@/components/layout/app-brand-bar'
import type { Locale } from '@/lib/i18n/types'

export function LocaleShell({
  children,
  initialLocale = 'he',
}: {
  children: ReactNode
  initialLocale?: Locale
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <AppBrandBar />
      {children}
    </LocaleProvider>
  )
}
