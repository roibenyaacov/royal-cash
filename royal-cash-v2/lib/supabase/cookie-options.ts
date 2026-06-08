import type { CookieOptionsWithName } from '@supabase/ssr'

function isRoyalCashHost(hostname: string | undefined): boolean {
  if (!hostname) return false
  const host = hostname.toLowerCase()
  return host === 'royalcash.app' || host === 'www.royalcash.app'
}

export function getSupabaseCookieOptions(
  isSecure: boolean,
  hostname?: string,
): CookieOptionsWithName {
  const options: CookieOptionsWithName = {}

  if (isSecure) {
    options.secure = true
  }

  // Share PKCE verifier + session between www and apex on production.
  if (isRoyalCashHost(hostname)) {
    options.domain = '.royalcash.app'
  }

  return options
}
