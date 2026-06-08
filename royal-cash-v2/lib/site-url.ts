const DEV_SITE_URL = 'http://localhost:3000'

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '')
}

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv) {
    return normalizeBaseUrl(fromEnv)
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    return `https://${normalizeBaseUrl(vercelUrl)}`
  }

  if (process.env.NODE_ENV === 'development') {
    return DEV_SITE_URL
  }

  if (typeof window !== 'undefined') {
    return normalizeBaseUrl(window.location.origin)
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
