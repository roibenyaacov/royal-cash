import { Button } from './button'

type ErrorMessageProps = {
  message: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="bg-negative/10 rounded-[var(--radius-card)] p-4 max-w-sm w-full text-center">
        <p className="text-negative text-sm">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          נסה שוב
        </Button>
      )}
    </div>
  )
}
