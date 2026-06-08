import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config'

function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw
  }
  return '/groups'
}

function withResumeParam(path: string): string {
  if (
    path.startsWith('/claim/') ||
    path.startsWith('/invite/group/')
  ) {
    const url = new URL(path, 'http://resume.local')
    url.searchParams.set('resume', '1')
    return `${url.pathname}${url.search}`
  }
  return path
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const next = withResumeParam(safeNextPath(searchParams.get('next')))

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth', request.url))
  }

  const redirectUrl = new URL(next, request.url)
  let response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.redirect(redirectUrl)
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('OAuth callback failed:', error.message)
    return NextResponse.redirect(new URL('/login?error=auth', request.url))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? user.email,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      },
      { onConflict: 'id' },
    )
  }

  return response
}
