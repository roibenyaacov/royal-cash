'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loading } from '@/components/ui/loading'

function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw
  }
  return '/groups'
}

function withResumeParam(path: string): string {
  if (
    path.startsWith('/claim/') ||
    path.startsWith('/invite/group/')
  ) {
    const url = new URL(path, 'http://resume.local')
    url.searchParams.set('resume', '1')
    return `${url.pathname}${url.search}`
  }
  return path
}

export default function AuthCallbackPage() {
  const searchParams = useSearchParams()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const next = withResumeParam(safeNextPath(searchParams.get('next')))
    const callbackUrl = window.location.href

    console.log('[auth/callback] page loaded', { callbackUrl, next })

    async function finishAuth() {
      const supabase = createClient()

      // detectSessionInUrl=true may already exchange the code during client init.
      // getSession() waits for that initializePromise to finish.
      let {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      console.log('[auth/callback] after initial getSession', {
        hasSession: Boolean(session),
        sessionError: sessionError?.message ?? null,
      })

      if (!session) {
        console.log('[auth/callback] calling exchangeCodeForSession with full URL')
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(callbackUrl)

        console.log('[auth/callback] after exchangeCodeForSession', {
          exchangeError: exchangeError?.message ?? null,
        })

        if (exchangeError) {
          console.error('OAuth callback failed:', exchangeError.message)
          window.location.replace('/login?error=auth')
          return
        }

        ;({
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession())

        console.log('[auth/callback] after getSession (post-exchange)', {
          hasSession: Boolean(session),
          sessionError: sessionError?.message ?? null,
        })
      }

      if (!session) {
        console.error('OAuth callback failed: Auth session missing!')
        window.location.replace('/login?error=auth')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name ?? user.email,
            avatar_url: user.user_metadata?.avatar_url ?? null,
          },
          { onConflict: 'id' },
        )

        if (profileError) {
          // Missing or failed profile must not log the user out.
          console.warn('[auth/callback] profile upsert failed:', profileError.message)
        }
      }

      console.log('[auth/callback] redirecting to', next)
      window.location.replace(next)
    }

    void finishAuth()
  }, [searchParams])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <Loading />
    </div>
  )
}
