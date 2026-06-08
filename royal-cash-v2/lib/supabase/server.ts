import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { getSupabaseCookieOptions } from '@/lib/supabase/cookie-options'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config'

export async function createClient() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const isSecure =
    headerStore.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https'
  const hostname = headerStore.get('host')?.split(':')[0]

  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookieOptions: getSupabaseCookieOptions(isSecure, hostname),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll can throw in Server Components (read-only cookies).
            // This is expected when called from a Server Component.
          }
        },
      },
    },
  )
}
