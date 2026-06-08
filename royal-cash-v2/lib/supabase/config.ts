export function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/rest\/v1$/, '')
}

export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!value) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }
  return normalizeSupabaseUrl(value)
}

export function getSupabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!value) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return value
}

export function hasSupabasePublicConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  )
}

/** Kong requires apikey on browser navigations; append only to Supabase authorize URL. */
export function ensureAuthorizeApiKey(authorizeUrl: string): string {
  const url = new URL(authorizeUrl)
  if (!url.searchParams.has('apikey')) {
    url.searchParams.set('apikey', getSupabaseAnonKey())
  }
  return url.toString()
}
