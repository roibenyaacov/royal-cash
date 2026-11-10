/**
 * The Apple App Site Association file, served at
 * `/.well-known/apple-app-site-association` through a rewrite in
 * next.config.ts.
 *
 * This is what makes `https://royalcash.app/...` open the installed app
 * instead of Safari. Two things depend on it:
 *
 *   - Sign-in. The OAuth round trip leaves the app for the system browser
 *     (Google refuses to authenticate inside an embedded web view) and has
 *     to come back. Without a universal link it lands in Safari and the
 *     user is signed in everywhere except the app they started from.
 *   - Invite and claim links. Somebody shares a group invite in WhatsApp;
 *     tapping it should open the app, not a web page asking them to
 *     install the app they already have.
 *
 * `APPLE_APP_ID_PREFIX` is the ten-character Team ID from the Apple
 * Developer account. Until it is set this responds 404 rather than serving
 * a file with a placeholder in it — a malformed association is cached hard
 * by Apple's CDN and is worse than an absent one.
 */
export const dynamic = 'force-dynamic'

const BUNDLE_ID = 'app.royalcash'

export function GET() {
  const teamId = process.env.APPLE_APP_ID_PREFIX

  if (!teamId) {
    return new Response('Not configured', { status: 404 })
  }

  const body = {
    applinks: {
      details: [
        {
          appIDs: [`${teamId}.${BUNDLE_ID}`],
          components: [
            { '/': '/auth/callback*', comment: 'OAuth return' },
            { '/': '/invite/*', comment: 'Group invites' },
            { '/': '/claim/*', comment: 'Player claim links' },
            { '/': '/game/*', comment: 'Shared game views' },
          ],
        },
      ],
    },
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      // Apple requires JSON and refuses a file served as text/plain.
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
