'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { he } from './he'
import { en } from './en'
import {
  LOCALE_STORAGE_KEY,
  localeMeta,
  type Locale,
  type TranslationDict,
} from './types'
import { setActiveLocale } from './dictionary'

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationDict
  dir: 'rtl' | 'ltr'
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(fallback: Locale): Locale {
  if (typeof window === 'undefined') return fallback
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return stored === 'en' ? 'en' : stored === 'he' ? 'he' : fallback
}

function applyDocumentLocale(locale: Locale) {
  const meta = localeMeta[locale]
  document.documentElement.lang = meta.lang
  document.documentElement.dir = meta.dir
}

function persistLocale(locale: Locale) {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  document.cookie = `${LOCALE_STORAGE_KEY}=${locale};path=/;max-age=31536000;sameSite=lax`
}

export function LocaleProvider({
  children,
  initialLocale = 'he',
}: {
  children: ReactNode
  initialLocale?: Locale
}) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    // Sync from localStorage on mount — runs once and reconciles the
    // server-rendered initialLocale with the user's stored preference.
    const stored = readStoredLocale(initialLocale)
    setActiveLocale(stored)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(stored)
    applyDocumentLocale(stored)
    persistLocale(stored)
  }, [initialLocale])

  const setLocale = useCallback(
    (next: Locale) => {
      setActiveLocale(next)
      setLocaleState(next)
      persistLocale(next)
      applyDocumentLocale(next)
      router.refresh()
    },
    [router],
  )

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: locale === 'en' ? en : he,
      dir: localeMeta[locale].dir,
    }),
    [locale, setLocale],
  )

  return (
    <LocaleContext.Provider value={value}>
      <div key={locale}>{children}</div>
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
