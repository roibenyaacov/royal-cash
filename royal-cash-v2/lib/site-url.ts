const DEV_SITE_URL = 'http://localhost:3000'
const PRODUCTION_SITE_URL = 'https://royalcash.app'

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '')
}

function isSupabaseProjectUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.supabase.co')
  } catch {
    return false
  }
}

function isValidSiteUrl(url: string): boolean {
  return Boolean(url) && !isSupabaseProjectUrl(url)
}

function stripWwwOrigin(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4)
    }
    return normalizeBaseUrl(parsed.origin)
  } catch {
    return url
  }
}

function resolveSiteUrl(): string {
  // Always prefer explicit env — keeps OAuth redirectTo on the apex domain.
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv && isValidSiteUrl(fromEnv)) {
    return stripWwwOrigin(normalizeBaseUrl(fromEnv))
  }

  if (typeof window !== 'undefined') {
    const origin = stripWwwOrigin(normalizeBaseUrl(window.location.origin))
    if (isValidSiteUrl(origin)) {
      return origin
    }
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    const candidate = `https://${normalizeBaseUrl(vercelUrl)}`
    if (isValidSiteUrl(candidate)) {
      return candidate
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_SITE_URL
  }

  return DEV_SITE_URL
}

/** Canonical app origin for links, OAuth redirects, and QR codes. */
export function getSiteUrl(): string {
  return resolveSiteUrl()
}

export function absoluteUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getSiteUrl()}${normalizedPath}`
}

export function getAuthCallbackUrl(nextPath?: string): string {
  if (nextPath) {
    return absoluteUrl(`/auth/callback?next=${encodeURIComponent(nextPath)}`)
  }
  return absoluteUrl('/auth/callback')
}

export function getClaimInviteUrl(token: string): string {
  return absoluteUrl(`/claim/${token}`)
}

export function getGroupInviteUrl(token: string): string {
  return absoluteUrl(`/invite/group/${token}`)
}

export function getGameAccessUrl(token: string): string {
  return absoluteUrl(`/game/${token}`)
}
