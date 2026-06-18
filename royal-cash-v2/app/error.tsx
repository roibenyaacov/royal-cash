'use client'

import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/i18n/locale-context'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLocale()

  // Never render the raw error.message — it can leak internal details
  // (file paths, query text, stack hints). The Next.js digest is enough
  // to correlate user reports with server logs.
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 bg-bg">
      <div className="flex flex-col items-center gap-4 max-w-sm w-full">
        <h1 className="text-xl font-bold text-text-primary">{t.common.error}</h1>
        <p className="text-text-secondary text-center text-sm">
          {t.common.somethingWentWrong}
        </p>
        {error.digest && (
          <p className="text-text-muted text-[10px] font-mono" dir="ltr">
            {error.digest}
          </p>
        )}
        <Button onClick={reset}>{t.common.tryAgain}</Button>
      </div>
    </div>
  )
}
