import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureAuthorizeApiKey } from '@/lib/supabase/config'
import { openOAuthUrl } from '@/lib/native/oauth-bridge'

/**
 * The sign-in providers the app offers.
 *
 * Apple is not a nicety: App Store review guideline 4.8 requires an app
 * that offers a third-party login to also offer an equivalent one that
 * does not share data with that third party, and Sign in with Apple is
 * the option that satisfies it. Google alone is an automatic rejection.
 */
export type OAuthProvider = 'google' | 'apple'

function buildOAuthRedirectTo(nextPath?: string): string {
  const origin = window.location.origin
  if (nextPath) {
    return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
  }
  return `${origin}/auth/callback`
}

export async function startOAuth(
  supabase: SupabaseClient,
  provider: OAuthProvider,
  nextPath?: string,
): Promise<void> {
  const redirectTo = buildOAuthRedirectTo(nextPath)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) throw error
  if (!data.url) throw new Error(`No OAuth URL returned for ${provider}`)

  const authorizeUrl = ensureAuthorizeApiKey(data.url)

  // Inside the native shell this goes to the system browser, because
  // Google will not authenticate in an embedded web view. On the web, and
  // if the native path fails for any reason, navigate as before.
  if (await openOAuthUrl(authorizeUrl)) return

  window.location.assign(authorizeUrl)
}
