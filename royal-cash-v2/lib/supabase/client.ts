'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseCookieOptions } from '@/lib/supabase/cookie-options'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config'

export function createClient() {
  const isSecure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'

  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: getSupabaseCookieOptions(isSecure),
  })
}
