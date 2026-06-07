'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { t } from '@/lib/i18n/dictionary'
import type { BuyIn, CashOut, Currency } from '@/lib/domain/types'

type PlayerCardProps = {
  name: string
  buyIns: BuyIn[]
  defaultBuyIn: number
  cashOut?: CashOut
  currency: Currency
  onAddDefault: () => void
  onRemoveDefault: () => void
  onSetCount: (count: number) => void
}

export function PlayerCard({
  name,
  buyIns,
  defaultBuyIn,
  cashOut,
  currency,
  onAddDefault,
  onRemoveDefault,
  onSetCount,
}: PlayerCardProps) {
  const symbol = t.currency[currency]
  const totalBuyIn = buyIns.reduce((s, b) => s + b.amount, 0)
  const defaultCount = buyIns.filter((b) => b.amount === defaultBuyIn).length

  const [countInput, setCountInput] = useState(String(defaultCount))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setCountInput(String(defaultCount))
    }
  }, [defaultCount])

  const commitCount = () => {
    const trimmed = countInput.trim()
    const parsed = trimmed === '' ? 0 : parseInt(trimmed, 10)
    if (!isNaN(parsed) && parsed >= 0) {
      setCountInput(String(parsed))
      if (parsed !== defaultCount) {
        onSetCount(parsed)
      }
    } else {
      setCountInput(String(defaultCount))
    }
  }

  const stepBtn =
    'flex items-center justify-center w-9 h-9 rounded-lg text-lg font-medium transition-colors active:scale-95'
  const countInputClass =
    'w-11 h-9 rounded-lg text-center text-[17px] font-semibold tabular-nums ' +
    'bg-surface-elevated border border-border text-text-primary ' +
    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30'

  return (
    <Card className="!p-2.5">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-2 min-w-0 max-w-full px-1">
          <span className="text-[16px] font-semibold text-text-primary truncate">
            {name}
          </span>
          <span className="text-text-muted/60 shrink-0" aria-hidden>
            ·
          </span>
          <span
            className="text-[16px] font-semibold text-accent tabular-nums shrink-0"
            dir="ltr"
          >
            {symbol}{totalBuyIn}
          </span>
          {cashOut != null && (
            <span className="text-xs text-text-muted shrink-0" dir="ltr">
              ({t.game.cashOut} {symbol}{cashOut.amount})
            </span>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={onRemoveDefault}
            disabled={defaultCount === 0}
            className={`${stepBtn} bg-surface-elevated border border-border text-text-primary disabled:opacity-30`}
            aria-label={t.game.removeBuyIn}
          >
            −
          </button>

          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={countInput}
            onChange={(e) => setCountInput(e.target.value.replace(/\D/g, ''))}
            onBlur={commitCount}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            className={countInputClass}
            dir="ltr"
            aria-label={t.game.buyInCount}
          />

          <button
            type="button"
            onClick={onAddDefault}
            className={`${stepBtn} bg-accent/10 text-accent border border-accent/20`}
            aria-label={t.game.addBuyIn}
          >
            +
          </button>
        </div>
      </div>
    </Card>
  )
}
