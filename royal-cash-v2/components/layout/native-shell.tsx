'use client'

import { useEffect } from 'react'
import { isNativePlatform } from '@/lib/native/platform'

/**
 * Native chrome that only applies inside the iOS shell.
 *
 * Mounted once, high in the tree. On the web every branch here is a no-op,
 * so the same build serves royalcash.app and the App Store app.
 */
export function NativeShell() {
  useEffect(() => {
    if (!isNativePlatform()) return

    let cancelled = false

    async function setUp() {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        if (cancelled) return
        // The app is dark throughout; without this the clock and battery
        // come up black on a near-black bar and vanish.
        await StatusBar.setStyle({ style: Style.Dark })
      } catch (err) {
        console.error('Status bar setup failed:', err)
      }
    }

    void setUp()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
