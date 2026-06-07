import { type ReactNode } from 'react'
import { ChevronForward } from '@/components/ui/chevron'

type IosListGroupProps = {
  children: ReactNode
  className?: string
}

export function IosListGroup({ children, className = '' }: IosListGroupProps) {
  return (
    <div
      className={`rounded-xl bg-surface border border-border/80 overflow-hidden divide-y divide-border/80 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] ${className}`}
    >
      {children}
    </div>
  )
}

type IosListRowProps = {
  children: ReactNode
  href?: string
  onClick?: () => void
  leading?: ReactNode
  trailing?: ReactNode
  showChevron?: boolean
  className?: string
}

const rowClass =
  'flex items-center gap-3.5 px-4 min-h-[44px] py-3 w-full text-right active:bg-surface-elevated/80 transition-colors'

export function IosListRow({
  children,
  href,
  onClick,
  leading,
  trailing,
  showChevron = true,
  className = '',
}: IosListRowProps) {
  const content = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">{children}</div>
      {trailing}
      {showChevron && <ChevronForward className="text-text-secondary shrink-0" />}
    </>
  )

  if (href) {
    return (
      <a href={href} className={`${rowClass} ${className}`}>
        {content}
      </a>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${rowClass} ${className}`}>
        {content}
      </button>
    )
  }

  return <div className={`${rowClass} ${className}`}>{content}</div>
}
