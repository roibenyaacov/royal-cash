import type { CookieOptionsWithName } from '@supabase/ssr'

export function getSupabaseCookieOptions(isSecure: boolean): CookieOptionsWithName {
  if (!isSecure) return {}
  return { secure: true }
}
