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

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 bg-bg">
      <div className="flex flex-col items-center gap-4 max-w-sm w-full">
        <h1 className="text-xl font-bold text-text-primary">{t.common.error}</h1>
        <p className="text-text-secondary text-center text-sm">
          {error.message || t.common.somethingWentWrong}
        </p>
        <Button onClick={reset}>{t.common.tryAgain}</Button>
      </div>
    </div>
  )
}
