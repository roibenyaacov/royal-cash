import { isNativePlatform } from '@/lib/native/platform'

/**
 * Sign-in from inside the native shell.
 *
 * ============================================
 * WHY THE SYSTEM BROWSER AND NOT THE WEB VIEW
 * ============================================
 * Google refuses OAuth inside an embedded web view and answers
 * `disallowed_useragent` instead — a deliberate anti-phishing measure, and
 * not something an app can opt out of. So the authorization step is handed
 * to the system browser (SFSafariViewController on iOS), which is also
 * where the user's existing Google session already lives, so most sign-ins
 * never ask for a password at all.
 *
 * ============================================
 * HOW IT GETS BACK
 * ============================================
 * Supabase redirects to `https://royalcash.app/auth/callback`. Because
 * that path is claimed as a universal link (see the association file at
 * `app/api/apple-app-site-association/route.ts`), iOS hands the URL to the
 * app rather than opening Safari, and it arrives here as an `appUrlOpen`
 * event.
 *
 * At that point the web view is still sitting on whatever page started the
 * sign-in, so nothing in it has seen the authorization code. Rather than
 * exchange the code here, the web view is simply navigated to the callback
 * URL — the same page, with the same parameters, that a browser sign-in
 * would have landed on. The Supabase browser client then completes the
 * exchange itself through `detectSessionInUrl`, exactly as on the web.
 *
 * Doing it this way keeps one code path for sessions instead of two, and
 * avoids a second, manual `exchangeCodeForSession` racing the automatic
 * one — a code is single-use, and whichever call loses that race fails.
 */

const CALLBACK_PATH = '/auth/callback'

type UrlOpenListener = { remove: () => Promise<void> | void }

let activeListener: UrlOpenListener | null = null

async function closeSystemBrowser(): Promise<void> {
  try {
    const { Browser } = await import('@capacitor/browser')
    await Browser.close()
  } catch {
    // Already dismissed by the user, or never opened. Nothing to do.
  }
}

/**
 * Starts listening for the OAuth return before the browser is opened.
 *
 * Registered first on purpose: on a fast network the redirect can arrive
 * before an await on `Browser.open` has resolved.
 */
async function listenForCallback(): Promise<void> {
  if (activeListener) return

  const { App } = await import('@capacitor/app')

  activeListener = await App.addListener('appUrlOpen', ({ url }) => {
    if (!url.includes(CALLBACK_PATH)) return

    void closeSystemBrowser()

    // Hand the whole URL, query and fragment included, to the web view.
    // The callback page reads it the same way it does in a browser.
    window.location.assign(url)

    void activeListener?.remove()
    activeListener = null
  })
}

/**
 * Opens an OAuth URL the way the current platform requires.
 *
 * Returns false on the web, where the caller should navigate normally.
 */
export async function openOAuthUrl(url: string): Promise<boolean> {
  if (!isNativePlatform()) return false

  try {
    await listenForCallback()
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url, presentationStyle: 'popover' })
    return true
  } catch (err) {
    console.error('Native OAuth browser failed, falling back to web view:', err)
    void activeListener?.remove()
    activeListener = null
    return false
  }
}
