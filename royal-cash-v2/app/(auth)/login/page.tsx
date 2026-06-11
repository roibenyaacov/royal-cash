'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { GoogleIcon } from '@/components/ui/google-icon'
import { useAuth } from '@/hooks/use-auth'
import { useLocale } from '@/lib/i18n/locale-context'
import { hasSupabasePublicConfig } from '@/lib/supabase/config'
import { ContactLink } from '@/components/layout/contact-link'

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const { t } = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchParams.get('error') === 'auth') {
      setError(t.auth.loginFailed)
    }
  }, [searchParams, t.auth.loginFailed])

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/groups')
    }
  }, [authLoading, user, router])

  async function handleGoogleSignIn() {
    setError('')
    if (!hasSupabasePublicConfig()) {
      setError(t.auth.loginConfigError)
      return
    }

    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Google sign-in failed:', err)
      setError(t.auth.loginFailed)
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0c0c0e]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a1a1c_0%,#0c0c0e_100%)]" />
        <div className="absolute top-[8%] left-1/2 h-[42%] w-[72%] -translate-x-1/2 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="mb-10 flex w-full flex-col items-center sm:mb-14">
          <div className="mb-6 drop-shadow-[0_0_24px_rgba(201,168,76,0.18)] sm:mb-8">
            <Image
              src="/logo.png"
              alt="Royal Cash"
              width={280}
              height={280}
              className="h-40 w-40 object-contain sm:h-48 sm:w-48"
              priority
            />
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-accent sm:text-[32px]">
              Royal Cash
            </h1>
            <p className="text-[17px] font-light text-text-primary/90 sm:text-lg">
              {t.auth.tagline}
            </p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-accent/10 bg-surface/60 p-7 shadow-2xl backdrop-blur-md sm:p-8">
          {error ? (
            <p className="mb-4 text-center text-sm text-negative">{error}</p>
          ) : null}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex h-[60px] w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-[#f2ca50] via-[#d4af37] to-[#b8860b] text-lg font-bold text-black shadow-[0_4px_15px_rgba(212,175,55,0.22)] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5 text-black" />
            <span>{loading ? t.auth.loggingIn : t.auth.loginWithGoogle}</span>
          </button>
        </div>
      </main>

      <footer className="relative z-10 flex flex-col items-center gap-4 pb-8">
        <div className="flex flex-col items-center gap-3 opacity-40">
          <div className="flex items-center gap-2 text-text-muted">
            <LockIcon />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em]">
              Secure
            </span>
          </div>
          <div className="h-px w-12 bg-accent/20" />
        </div>
        <ContactLink />
      </footer>
    </div>
  )
}
