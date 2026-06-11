'use client'

import { CONTACT_EMAIL, contactMailtoUrl } from '@/lib/contact'
import { useLocale } from '@/lib/i18n/locale-context'

function MailIcon({ className = 'w-4 h-4' }: { className?: string }) {
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  )
}

type ContactLinkProps = {
  variant?: 'footer' | 'row'
}

export function ContactLink({ variant = 'footer' }: ContactLinkProps) {
  const { t } = useLocale()
  const href = contactMailtoUrl(t.contact.emailSubject)

  if (variant === 'row') {
    return (
      <a
        href={href}
        className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface-elevated border border-border px-4 py-3 transition-colors active:bg-surface"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <MailIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary">{t.contact.label}</p>
          <p className="text-xs text-text-muted truncate" dir="ltr">
            {CONTACT_EMAIL}
          </p>
        </div>
        <span className="text-text-muted text-lg" aria-hidden>
          ›
        </span>
      </a>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-xs text-text-muted">{t.contact.prompt}</p>
      <a
        href={href}
        className="text-xs text-accent/80 underline-offset-2 hover:text-accent hover:underline transition-colors"
        dir="ltr"
      >
        {CONTACT_EMAIL}
      </a>
    </div>
  )
}
