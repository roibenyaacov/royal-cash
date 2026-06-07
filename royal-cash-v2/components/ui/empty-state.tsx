import { type ReactNode } from 'react'

type EmptyStateProps = {
  message: string
  action?: ReactNode
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <p className="text-text-muted text-center">{message}</p>
      {action}
    </div>
  )
}
