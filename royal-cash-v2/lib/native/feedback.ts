import { isNativePlatform } from '@/lib/native/platform'

/**
 * A tap you can feel when money moves.
 *
 * At a real table the host is looking at the chips, not the screen, and
 * taps "+" by muscle memory. A short impact is how they know the buy-in
 * registered without checking — the thing a web page in a window cannot
 * do, and part of why this is an app at all.
 *
 * Every call is best-effort: a failed haptic must never interrupt the
 * action it was decorating.
 */
type ImpactWeight = 'light' | 'medium' | 'heavy'

export async function impact(weight: ImpactWeight = 'light'): Promise<void> {
  if (!isNativePlatform()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    const style =
      weight === 'heavy'
        ? ImpactStyle.Heavy
        : weight === 'medium'
          ? ImpactStyle.Medium
          : ImpactStyle.Light
    await Haptics.impact({ style })
  } catch (err) {
    console.error('Haptic impact failed:', err)
  }
}

/** For a finished action — a table closed, a settlement saved. */
export async function notifySuccess(): Promise<void> {
  if (!isNativePlatform()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch (err) {
    console.error('Haptic notification failed:', err)
  }
}
