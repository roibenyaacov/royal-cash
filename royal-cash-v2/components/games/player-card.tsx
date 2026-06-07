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
  onCustomBuyIn: () => void
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
  onCustomBuyIn,
}: PlayerCardProps) {
  const symbol = t.currency[currency]
  const totalBuyIn = buyIns.reduce((s, b) => s + b.amount, 0)
  const defaultCount = buyIns.filter((b) => b.amount === defaultBuyIn).length
  const customTotal = buyIns
    .filter((b) => b.amount !== defaultBuyIn)
    .reduce((s, b) => s + b.amount, 0)

  const [editingCount, setEditingCount] = useState(false)
  const [countInput, setCountInput] = useState(String(defaultCount))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editingCount) setCountInput(String(defaultCount))
  }, [defaultCount, editingCount])

  useEffect(() => {
    if (editingCount) inputRef.current?.focus()
  }, [editingCount])

  const commitCount = () => {
    const parsed = parseInt(countInput)
    if (!isNaN(parsed) && parsed >= 0) {
      onSetCount(parsed)
    }
    setEditingCount(false)
  }

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-text-primary">{name}</h3>
            <p className="text-sm text-text-muted">
              {t.game.totalBuyIns}: {symbol}{totalBuyIn}
            </p>
            {customTotal > 0 && (
              <p className="text-xs text-text-muted">
                {t.game.customBuyIns}: {symbol}{customTotal}
              </p>
            )}
            {cashOut && (
              <p className="text-sm text-text-secondary">
                {t.game.cashOut}: {symbol}{cashOut.amount}
              </p>
            )}
          </div>
          <button
            onClick={onCustomBuyIn}
            className="bg-accent/10 text-accent rounded-[var(--radius-button)]
              px-3 py-2 text-sm font-medium min-h-[40px]"
          >
            {t.game.customAmount}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-text-secondary shrink-0">
            {t.game.buyInCount} ({symbol}{defaultBuyIn})
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onRemoveDefault}
              disabled={defaultCount === 0}
              className="bg-surface-elevated border border-border rounded-[var(--radius-button)]
                w-10 h-10 text-lg font-bold text-text-primary
                disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={t.game.removeBuyIn}
            >
              −
            </button>

            {editingCount ? (
              <input
                ref={inputRef}
                type="number"
                min={0}
                value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
                onBlur={commitCount}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitCount()
                  if (e.key === 'Escape') setEditingCount(false)
                }}
                className="w-12 h-10 text-center text-lg font-bold
                  bg-surface-elevated border border-accent rounded-[var(--radius-input)]
                  text-text-primary"
                dir="ltr"
              />
            ) : (
              <button
                onClick={() => setEditingCount(true)}
                className="w-12 h-10 text-lg font-bold text-text-primary
                  bg-surface-elevated border border-border rounded-[var(--radius-input)]"
                dir="ltr"
              >
                {defaultCount}
              </button>
            )}

            <button
              onClick={onAddDefault}
              className="bg-accent/10 text-accent rounded-[var(--radius-button)]
                w-10 h-10 text-lg font-bold"
              aria-label={t.game.addBuyIn}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}
