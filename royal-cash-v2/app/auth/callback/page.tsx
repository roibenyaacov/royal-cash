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

    const code = searchParams.get('code')
    const next = withResumeParam(safeNextPath(searchParams.get('next')))

    if (!code) {
      window.location.replace('/login?error=auth')
      return
    }

    async function finishAuth() {
      const supabase = createClient()

      // The browser client (detectSessionInUrl=true) automatically exchanges the
      // PKCE code during initialization. getUser() awaits that initializePromise,
      // so by the time it returns the code has been exchanged and the session is set.
      // Calling exchangeCodeForSession manually here would fail because the PKCE
      // verifier is already consumed by the auto-init.
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        console.error('OAuth callback failed:', error?.message ?? 'No user after code exchange')
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
        console.error('Profile upsert failed:', profileError.message)
      }

      // Full navigation ensures session cookies reach the server proxy on HTTPS.
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
