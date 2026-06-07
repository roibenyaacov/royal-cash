'use client'

import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 bg-bg">
      <div className="flex flex-col items-center gap-4 max-w-sm w-full">
        <h1 className="text-xl font-bold text-text-primary">שגיאה</h1>
        <p className="text-text-secondary text-center text-sm">
          {error.message || 'משהו השתבש. נסה שוב.'}
        </p>
        <Button onClick={reset}>נסה שוב</Button>
      </div>
    </div>
  )
}
