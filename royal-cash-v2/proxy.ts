import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// '/legal' has to be reachable without an account: App Store Connect
// requires a privacy policy at a URL a reviewer can open cold, and a policy
// behind a login is no policy at all.
const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/claim',
  '/invite',
  '/game',
  '/legal',
  // Apple fetches this with no session and will not follow a redirect.
  '/.well-known',
  '/api/apple-app-site-association',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next({ request })
  }

  const { response, isAuthenticated } = await updateSession(request)

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!isAuthenticated && !isPublic && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/groups'
    return NextResponse.redirect(url)
  }

  response.headers.set(
    'Cache-Control',
    'private, no-store, no-cache, must-revalidate',
  )

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
  ],
}
