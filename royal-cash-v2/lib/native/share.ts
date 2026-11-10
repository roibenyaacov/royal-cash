import { isNativePlatform } from '@/lib/native/platform'

/**
 * Hand the settlement text to the system share sheet.
 *
 * On the web the app opens `wa.me`, which is the only thing a browser can
 * do. Inside the app that is the wrong behaviour twice over: it bounces
 * the user out to Safari and then to WhatsApp, and it assumes WhatsApp is
 * where the group talks. The native sheet lets them send it wherever they
 * actually are, without leaving the app on the way.
 *
 * Returns false when nothing was shared — cancelled, unavailable, or on
 * the web — so the caller can fall back to the `wa.me` link.
 */
export async function shareText(text: string, title?: string): Promise<boolean> {
  if (!isNativePlatform()) return false
  try {
    const { Share } = await import('@capacitor/share')
    const { value } = await Share.canShare()
    if (!value) return false
    await Share.share({ text, title, dialogTitle: title })
    return true
  } catch (err) {
    // A cancelled share sheet throws too, which is not an error worth
    // reporting — either way the caller should not also open WhatsApp.
    console.error('Native share unavailable or cancelled:', err)
    return false
  }
}
