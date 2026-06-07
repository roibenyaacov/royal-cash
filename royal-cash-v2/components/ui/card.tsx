import { type HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean
}

export function Card({
  elevated = false,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-[var(--radius-card)] p-4
        ${elevated ? 'bg-surface-elevated' : 'bg-surface'}
        border border-border
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}
