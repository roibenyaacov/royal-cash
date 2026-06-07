import type { Metadata, Viewport } from 'next'
import './globals.css'
import { LocaleShell } from '@/components/layout/locale-shell'
import { getLocale, localeMeta } from '@/lib/i18n/get-translations'

export const metadata: Metadata = {
  title: 'Royal Cash',
  description: 'Close the night without the headache',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Royal Cash',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f0f0f',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const meta = localeMeta[locale]

  return (
    <html lang={meta.lang} dir={meta.dir} className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <LocaleShell initialLocale={locale}>{children}</LocaleShell>
      </body>
    </html>
  )
}
