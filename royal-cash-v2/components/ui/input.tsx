'use client'

import { type InputHTMLAttributes, forwardRef } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, className = '', id, ...props }, ref) {
    const inputId = id ?? label?.replace(/\s+/g, '-').toLowerCase()

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full rounded-[var(--radius-input)] bg-surface-elevated
            border border-border px-3 py-3 min-h-[44px]
            text-text-primary placeholder:text-text-muted
            focus:outline-none focus:border-accent
            transition-colors
            ${error ? 'border-negative' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-sm text-negative">{error}</p>}
      </div>
    )
  },
)
