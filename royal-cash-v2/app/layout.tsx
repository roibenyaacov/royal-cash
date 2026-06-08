import type { Metadata, Viewport } from 'next'
import './globals.css'
import { LocaleShell } from '@/components/layout/locale-shell'
import { getLocale, localeMeta } from '@/lib/i18n/get-translations'
import { absoluteUrl, getSiteUrl } from '@/lib/site-url'

const siteUrl = getSiteUrl()

const siteName = 'Royal Cash'
const title = 'Royal Cash | סוגרים את הערב בלי כאב ראש'
const description =
  'Royal Cash — אפליקציה לניהול קופה בערבי פוקר עם החבורה. עוקבים אחרי כניסות, הוצאות וחלוקות, וסוגרים את הערב בלי כאב ראש — מהטלפון, בזמן אמת.'
const ogDescription =
  'עוקבים אחרי כניסות, הוצאות וסגירת ערב הוגנת עם החבורה. סוגרים את הערב בלי כאב ראש — מהטלפון, בזמן אמת.'
const imageAlt = 'Royal Cash — סוגרים את הערב בלי כאב ראש'
const ogImageUrl = absoluteUrl('/opengraph-image.png')
const twitterImageUrl = absoluteUrl('/twitter-image.png')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: '%s | Royal Cash',
  },
  description,
  applicationName: siteName,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: siteName,
  },
  openGraph: {
    title,
    description: ogDescription,
    siteName,
    locale: 'he_IL',
    type: 'website',
    url: '/',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: imageAlt,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description: ogDescription,
    images: [twitterImageUrl],
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
