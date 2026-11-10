import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The native iOS shell.
 *
 * ============================================
 * WHY THIS LOADS A REMOTE URL
 * ============================================
 * Capacitor normally ships a folder of static files inside the app. Royal
 * Cash cannot produce one: it is a Next.js app built on Server Actions,
 * server components and `proxy.ts` middleware, none of which survive
 * `output: 'export'`. Turning it into a static bundle would mean replacing
 * every server action with a hand-written API route — a rewrite of the
 * whole data layer, not a build-config change.
 *
 * So the shell loads the deployed app over HTTPS, and `webDir` below is
 * only the offline fallback described further down.
 *
 * ============================================
 * WHAT THAT COSTS, AND WHAT PAYS FOR IT
 * ============================================
 * App Store review guideline 4.2 rejects apps that are a web page in a
 * window. A shell that only points at a URL is exactly that. What makes
 * this an app rather than a bookmark is the native behaviour wired up
 * around it — the share sheet, haptics at the table, the status bar, and
 * sign-in through the system browser rather than an embedded web view.
 * Those are in `lib/native/`. Removing them does not just lose polish; it
 * loses the argument for the app existing.
 *
 * ============================================
 * BEFORE THE FIRST BUILD
 * ============================================
 * `npx cap add ios` has to run on macOS — it invokes CocoaPods. See
 * docs/APP_STORE.md for the full sequence.
 */
const config: CapacitorConfig = {
  appId: 'app.royalcash',
  appName: 'Royal Cash',

  // Unused while `server.url` is set, but `cap sync` requires the folder to
  // exist. It holds the page shown when the device is offline.
  webDir: 'native/www',

  server: {
    url: 'https://royalcash.app',
    // The deployed app is HTTPS-only; without this the web view would be
    // willing to fall back to cleartext.
    androidScheme: 'https',
    iosScheme: 'https',
    // Hosts the web view may navigate to without being handed off to
    // Safari. Everything else opens outside the app, which is what should
    // happen to an arbitrary link somebody pastes into a game note.
    allowNavigation: [
      'royalcash.app',
      '*.royalcash.app',
      '*.supabase.co',
    ],
  },

  ios: {
    // The table layout already draws its own safe-area padding, so letting
    // the web view inset again would double it.
    contentInset: 'never',
    backgroundColor: '#0f0f0f',
    // Matches the app's own dark surface, so a slow first paint shows the
    // app's background rather than a white flash.
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },

  plugins: {
    CapacitorHttp: {
      // Supabase's client sets its own headers and reads its own cookies;
      // routing its fetches through the native HTTP layer breaks both.
      enabled: false,
    },
  },
}

export default config
