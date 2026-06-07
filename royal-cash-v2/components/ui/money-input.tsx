'use client'

import { type InputHTMLAttributes, forwardRef } from 'react'
import type { Currency } from '@/lib/domain/types'
import { t } from '@/lib/i18n/dictionary'

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string
  error?: string
  currency?: Currency
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    { label, error, currency = 'ILS', className = '', id, ...props },
    ref,
  ) {
    const inputId = id ?? label?.replace(/\s+/g, '-').toLowerCase()
    const symbol = t.currency[currency]

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">
            {symbol}
          </span>
          <input
            ref={ref}
            id={inputId}
            inputMode="numeric"
            pattern="[0-9]*"
            className={`
              w-full rounded-[var(--radius-input)] bg-surface-elevated
              border border-border ps-9 pe-3 py-3 min-h-[44px]
              text-text-primary placeholder:text-text-muted
              focus:outline-none focus:border-accent
              transition-colors tabular-nums
              ${error ? 'border-negative' : ''}
              ${className}
            `}
            dir="ltr"
            {...props}
          />
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
      </div>
    )
  },
)
