'use client'

import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type HeaderIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  label: string
}

export function HeaderIconButton({
  children,
  label,
  className = '',
  ...props
}: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`
        flex items-center justify-center
        w-9 h-9 min-w-9 min-h-9
        rounded-full
        bg-accent/12 text-accent
        border border-accent/20
        shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
        active:scale-[0.94] active:bg-accent/20
        transition-all duration-150
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}

export function PlusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}
