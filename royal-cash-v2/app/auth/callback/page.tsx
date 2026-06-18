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

    async function finishAuth() {
      const supabase = createClient()

      // createBrowserClient is configured with detectSessionInUrl: true,
      // which auto-exchanges the OAuth code during initialization.
      // getUser() waits for that initializePromise to settle, so we never
      // need to call exchangeCodeForSession() manually (doing so causes
      // double-exchange bugs that intermittently break login).
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        window.location.replace('/login?error=auth')
        return
      }

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
