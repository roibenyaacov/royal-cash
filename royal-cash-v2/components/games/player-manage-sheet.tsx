'use client'

import { useState } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { MoneyInput } from '@/components/ui/money-input'
import { Button } from '@/components/ui/button'
import type { BuyIn, CashOut, Currency, Player } from '@/lib/domain/types'

type Props = {
  open: boolean
  onClose: () => void
  player: Player | null
  buyIns: BuyIn[]
  cashOut: CashOut | null
  defaultBuyIn: number
  currency: Currency
  onAddBuyIn: (amount: number) => void
  onRemoveBuyIn: (buyInId: string) => void
  onSetCashOut: (amount: number) => void
  onClearCashOut: () => void
}

export function PlayerManageSheet({ open, onClose, player, ...rest }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title={t.game.manageTitle}>
      {/* BottomSheet unmounts its children when closed, so keying on the player
          id gives each open a fresh form seeded from the current values — no
          effects, no stale inputs. */}
      {player && (
        <ManageContent
          key={player.id}
          player={player}
          onClose={onClose}
          {...rest}
        />
      )}
    </BottomSheet>
  )
}

type ContentProps = Omit<Props, 'open' | 'player'> & { player: Player }

function ManageContent({
  onClose,
  player,
  buyIns,
  cashOut,
  defaultBuyIn,
  currency,
  onAddBuyIn,
  onRemoveBuyIn,
  onSetCashOut,
  onClearCashOut,
}: ContentProps) {
  const symbol = t.currency[currency]
  const [buyInAmount, setBuyInAmount] = useState(String(defaultBuyIn))
  const [cashOutInput, setCashOutInput] = useState(
    cashOut ? String(cashOut.amount) : '',
  )

  const totalBuyIn = buyIns.reduce((s, b) => s + b.amount, 0)
  const sortedBuyIns = [...buyIns].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  )

  const parsedAdd = parseInt(buyInAmount, 10)
  const canAdd = !isNaN(parsedAdd) && parsedAdd > 0

  const parsedCashOut = parseInt(cashOutInput, 10)
  const hasCashOutInput = cashOutInput.trim() !== '' && !isNaN(parsedCashOut)
  const previewNet = (hasCashOutInput ? parsedCashOut : 0) - totalBuyIn

  const handleAdd = () => {
    if (!canAdd) return
    onAddBuyIn(parsedAdd)
    setBuyInAmount(String(defaultBuyIn))
  }

  const handleSaveCashOut = () => {
    if (!hasCashOutInput || parsedCashOut < 0) return
    onSetCashOut(parsedCashOut)
    onClose()
  }

  const handleClear = () => {
    setCashOutInput('')
    onClearCashOut()
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Player header */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-text-primary truncate">
          {player.display_name}
        </span>
        <span className="text-sm text-text-muted">
          {t.game.totalBuyIns}:{' '}
          <span className="font-semibold text-accent tabular-nums" dir="ltr">
            {symbol}{totalBuyIn}
          </span>
        </span>
      </div>

      {/* Buy-ins */}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm text-text-secondary">{t.game.buyInCount}</h3>

        {sortedBuyIns.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sortedBuyIns.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onRemoveBuyIn(b.id)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated ps-3 pe-2 py-1.5 text-sm text-text-primary active:bg-surface transition-colors"
                aria-label={`${t.game.removeBuyIn} ${symbol}${b.amount}`}
              >
                <span className="tabular-nums" dir="ltr">
                  {symbol}{b.amount}
                </span>
                <span className="text-text-muted text-base leading-none">×</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <MoneyInput
              value={buyInAmount}
              onChange={(e) => setBuyInAmount(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              currency={currency}
              placeholder={String(defaultBuyIn)}
            />
          </div>
          <Button onClick={handleAdd} disabled={!canAdd}>
            {t.game.addBuyInCustom}
          </Button>
        </div>
      </section>

      {/* Cash-out */}
      <section className="flex flex-col gap-2 border-t border-border pt-4">
        <h3 className="text-sm text-text-secondary">{t.game.cashOutAmount}</h3>

        <MoneyInput
          value={cashOutInput}
          onChange={(e) => setCashOutInput(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          currency={currency}
          placeholder="0"
        />

        {hasCashOutInput && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">{t.game.net}</span>
            <span
              className={`font-semibold tabular-nums ${
                previewNet >= 0 ? 'text-positive' : 'text-negative'
              }`}
              dir="ltr"
            >
              {previewNet >= 0 ? '+' : '−'}{symbol}{Math.abs(previewNet)}
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {cashOut && (
            <Button variant="secondary" fullWidth onClick={handleClear}>
              {t.game.clearCashOut}
            </Button>
          )}
          <Button
            fullWidth
            onClick={handleSaveCashOut}
            disabled={!hasCashOutInput || parsedCashOut < 0}
          >
            {cashOut ? t.game.updateCashOut : t.game.markCashOut}
          </Button>
        </div>
      </section>
    </div>
  )
}
