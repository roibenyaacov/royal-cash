/**
 * Is the app running inside the native iOS shell, or in a browser?
 *
 * Every native call in this folder goes through here first. The same code
 * serves royalcash.app in Safari and the App Store build, and the web
 * version must not attempt a plugin call that does not exist there.
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor
  return cap?.isNativePlatform?.() === true
}

/** Narrower: iOS specifically, for behaviour that differs from Android. */
export function isNativeIOS(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as { Capacitor?: { getPlatform?: () => string } })
    .Capacitor
  return cap?.getPlatform?.() === 'ios'
}
