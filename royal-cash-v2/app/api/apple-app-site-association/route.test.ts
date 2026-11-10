import { describe, it, expect, afterEach } from 'vitest'
import { GET } from './route'

const ORIGINAL = process.env.APPLE_APP_ID_PREFIX

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.APPLE_APP_ID_PREFIX
  else process.env.APPLE_APP_ID_PREFIX = ORIGINAL
})

describe('apple-app-site-association', () => {
  it('404s rather than serving a file with a placeholder Team ID', () => {
    // Apple's CDN caches this hard. An absent file is recoverable; a
    // wrong one strands universal links until the cache expires.
    delete process.env.APPLE_APP_ID_PREFIX
    expect(GET().status).toBe(404)
  })

  it('serves JSON Apple will accept once the Team ID is set', async () => {
    process.env.APPLE_APP_ID_PREFIX = 'ABCDE12345'
    const res = GET()

    expect(res.status).toBe(200)
    // Apple rejects the file unless it is served as JSON.
    expect(res.headers.get('Content-Type')).toBe('application/json')

    const body = await res.json()
    expect(body.applinks.details[0].appIDs).toEqual(['ABCDE12345.app.royalcash'])

    const paths = body.applinks.details[0].components.map(
      (c: { '/': string }) => c['/'],
    )
    // The OAuth return is the one that breaks sign-in if it is missing.
    expect(paths).toContain('/auth/callback*')
    expect(paths).toContain('/invite/*')
    expect(paths).toContain('/claim/*')
  })
})
