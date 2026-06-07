'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/locale-context'
import { localeMeta, type Locale } from '@/lib/i18n/types'

function GlobeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.8 2.5 14.2 0 18" />
      <path d="M12 3c-2.5 2.8-2.5 14.2 0 18" />
    </svg>
  )
}

export function AppBrandBar() {
  const { locale, setLocale } = useLocale()

  return (
    <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-xl border-b border-border/80 safe-top">
      <div className="flex items-center justify-between px-4 h-11 gap-3">
        <Link href="/groups" className="flex items-center min-w-0 shrink">
          <Image
            src="/logo.png"
            alt="Royal Cash"
            width={88}
            height={28}
            className="h-7 w-auto object-contain"
            priority
          />
        </Link>

        <div
          className="flex items-center rounded-lg border border-border bg-surface-elevated p-0.5 shrink-0"
          role="group"
          aria-label="Language"
        >
          {(['he', 'en'] as Locale[]).map((code) => {
            const active = locale === code
            return (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors min-h-[28px] ${
                  active
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {active && <GlobeIcon className="w-3.5 h-3.5" />}
                {localeMeta[code].label}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
