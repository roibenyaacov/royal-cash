import type { Metadata, Viewport } from 'next'
import './globals.css'
import { LocaleShell } from '@/components/layout/locale-shell'
import { getLocale, localeMeta } from '@/lib/i18n/get-translations'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

const siteName = 'Royal Cash'
const title =
  'Royal Cash | קופה משותפת לפוקר — סוגרים את הערב בלי כאב ראש'
const description =
  'Royal Cash — אפליקציה לניהול קופה משותפת בערבי פוקר עם החבורה. עוקבים אחרי כניסות, הוצאות וחלוקות, וסוגרים את הערב בלי כאב ראש — מהטלפון, בזמן אמת.'
const ogDescription =
  'קופה משותפת לפוקר עם החבורה: כניסות, הוצאות וסגירת ערב הוגנת. סוגרים את הערב בלי כאב ראש — מהטלפון, בזמן אמת.'
const imageAlt = 'Royal Cash — סוגרים את הערב בלי כאב ראש'

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
        url: '/opengraph-image.png',
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
    images: ['/twitter-image.png'],
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
