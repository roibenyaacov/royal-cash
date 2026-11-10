'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n/locale-context'
import { LEGAL_LAST_UPDATED, type LegalDocument } from '@/lib/legal/content'

type LegalDocumentViewProps = {
  he: LegalDocument
  en: LegalDocument
  /** The other document, linked at the foot so both are one tap apart. */
  otherHref: string
  otherLabelHe: string
  otherLabelEn: string
}

/**
 * Renders a legal document in whichever language the app is set to.
 *
 * These pages sit outside the authenticated area on purpose: App Store
 * Connect needs a privacy policy at a URL a reviewer can open without an
 * account, and a policy you have to sign in to read is not a policy.
 */
export function LegalDocumentView({
  he,
  en,
  otherHref,
  otherLabelHe,
  otherLabelEn,
}: LegalDocumentViewProps) {
  const { locale } = useLocale()
  const doc = locale === 'en' ? en : he
  const otherLabel = locale === 'en' ? otherLabelEn : otherLabelHe
  const backLabel = locale === 'en' ? 'Back to the app' : 'חזרה לאפליקציה'

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
      <h1 className="text-2xl font-bold text-text-primary">{doc.title}</h1>
      <p className="mt-1 text-xs text-text-muted">
        {doc.updated}: {LEGAL_LAST_UPDATED}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-text-secondary">
        {doc.intro}
      </p>

      <div className="mt-7 flex flex-col gap-6">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-semibold text-text-primary">
              {section.heading}
            </h2>
            <div className="mt-2 flex flex-col gap-2">
              {section.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm leading-relaxed text-text-secondary"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5">
        <Link href={otherHref} className="text-sm text-accent">
          {otherLabel}
        </Link>
        <Link href="/" className="text-sm text-text-muted">
          {backLabel}
        </Link>
      </div>
    </main>
  )
}
