'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useLocale } from '@/lib/i18n/locale-context'
import type { Locale } from '@/lib/i18n/types'

function GlobeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
      <path d="M12 2a14.5 14.5 0 0 1 4 10 14.5 14.5 0 0 1-4 10 14.5 14.5 0 0 1-4-10 14.5 14.5 0 0 1 4-10z" />
    </svg>
  )
}

function SignOutIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 text-accent shrink-0"
      aria-hidden
    >
      <path d="M3 8.5 6.5 12 13 4" />
    </svg>
  )
}

const languageOptions: { code: Locale; labelKey: 'hebrew' | 'english' }[] = [
  { code: 'he', labelKey: 'hebrew' },
  { code: 'en', labelKey: 'english' },
]

function LanguageMenu({
  className = '',
}: {
  className?: string
}) {
  const { locale, setLocale, t } = useLocale()
  const [showLanguage, setShowLanguage] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => setShowLanguage(false), [])

  function selectLanguage(code: Locale) {
    if (code !== locale) setLocale(code)
    closeMenu()
  }

  useEffect(() => {
    if (!showLanguage) return

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(e.target as Node)) closeMenu()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showLanguage, closeMenu])

  return (
    <div ref={menuRef} className={className}>
      <button
        type="button"
        aria-label={t.common.language}
        aria-expanded={showLanguage}
        aria-haspopup="menu"
        onClick={() => setShowLanguage((open) => !open)}
        className={`p-1 text-accent transition-opacity active:opacity-70 ${
          showLanguage ? 'opacity-100' : ''
        }`}
      >
        <GlobeIcon className="w-5 h-5" />
      </button>

      {showLanguage && (
        <div
          role="menu"
          aria-label={t.common.chooseLanguage}
          className="absolute top-[calc(100%+6px)] end-0 min-w-[148px] rounded-xl border border-border/80 bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.35)] py-1 z-[60] overflow-hidden"
        >
          {languageOptions.map(({ code, labelKey }) => {
            const active = locale === code
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => selectLanguage(code)}
                className={`flex items-center justify-between gap-3 w-full px-3.5 py-2.5 text-sm font-medium transition-colors active:bg-surface-elevated ${
                  active ? 'text-accent' : 'text-text-primary'
                }`}
              >
                <span>{t.common[labelKey]}</span>
                {active ? <CheckIcon /> : <span className="w-3.5 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SignOutButton({ className = '' }: { className?: string }) {
  const router = useRouter()
  const { signOut } = useAuth()
  const { t } = useLocale()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      router.replace('/login')
      router.refresh()
    } catch (err) {
      console.error('Failed to sign out:', err)
      setSigningOut(false)
    }
  }

  return (
    <button
      type="button"
      aria-label={signingOut ? t.auth.signingOut : t.auth.signOut}
      disabled={signingOut}
      onClick={handleSignOut}
      className={`p-1 text-text-muted transition-colors hover:text-negative active:opacity-70 disabled:opacity-50 ${className}`}
    >
      <SignOutIcon className="w-5 h-5" />
    </button>
  )
}

export function AppBrandBar() {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return (
      <LanguageMenu className="fixed top-0 end-0 z-50 p-4 safe-top" />
    )
  }

  return (
    <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-xl border-b border-border/80 safe-top">
      <div className="relative flex items-center justify-center px-4 h-11">
        <SignOutButton className="absolute start-4 top-1/2 -translate-y-1/2" />

        <Link href="/groups" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Royal Cash"
            width={100}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>

        <LanguageMenu className="absolute end-4 top-1/2 -translate-y-1/2" />
      </div>
    </header>
  )
}
