'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseCookieOptions } from '@/lib/supabase/cookie-options'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config'

export function createClient() {
  const isSecure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : undefined

  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: getSupabaseCookieOptions(isSecure, hostname),
    auth: {
      // Callback is handled server-side in app/auth/callback/route.ts.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  })
}
