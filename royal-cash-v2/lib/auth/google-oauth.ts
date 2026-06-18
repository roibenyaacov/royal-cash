import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureAuthorizeApiKey } from '@/lib/supabase/config'

function buildOAuthRedirectTo(nextPath?: string): string {
  const origin = window.location.origin
  if (nextPath) {
    return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
  }
  return `${origin}/auth/callback`
}

export async function startGoogleOAuth(
  supabase: SupabaseClient,
  nextPath?: string,
): Promise<void> {
  const redirectTo = buildOAuthRedirectTo(nextPath)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) throw error
  if (!data.url) throw new Error('No OAuth URL returned from Supabase')

  window.location.assign(ensureAuthorizeApiKey(data.url))
}
