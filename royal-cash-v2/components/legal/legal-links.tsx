'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n/locale-context'

/**
 * The privacy policy and terms, one tap from wherever this is placed.
 *
 * App review checks that both are reachable from inside the app and not
 * only from the store listing, so this belongs on the sign-in screen —
 * where consent is actually given — as well as in the profile.
 */
export function LegalLinks({ className = '' }: { className?: string }) {
  const { locale } = useLocale()
  const privacy = locale === 'en' ? 'Privacy Policy' : 'מדיניות פרטיות'
  const terms = locale === 'en' ? 'Terms of Use' : 'תנאי שימוש'

  return (
    <div
      className={`flex items-center justify-center gap-4 text-[11px] text-text-muted ${className}`}
    >
      <Link href="/legal/privacy" className="active:opacity-60 transition-opacity">
        {privacy}
      </Link>
      <span aria-hidden className="opacity-40">·</span>
      <Link href="/legal/terms" className="active:opacity-60 transition-opacity">
        {terms}
      </Link>
    </div>
  )
}
