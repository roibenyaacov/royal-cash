'use client'

import { useEffect, useRef, useState } from 'react'
import { t } from '@/lib/i18n/dictionary'
import type { BuyIn, CashOut, Currency } from '@/lib/domain/types'

// ---------------------------------------------------------------------------
// PokerTable — seats the players around a felt table instead of a flat list.
//
// Players are distributed around an oval felt: one seat caps the top, one caps
// the bottom, and the rest face each other down the left and right rails. The
// felt is a contained, normal-sized oval (not a full-bleed background) and
// grows taller as players are added, so 8+ players stay readable (the page
// scrolls) instead of cramming. The pot + active-player count sit in the
// middle of the felt.
// ---------------------------------------------------------------------------

export type TableSeatData = {
  id: string
  name: string
  buyIns: BuyIn[]
  cashOut: CashOut | null
}

type PokerTableProps = {
  seats: TableSeatData[]
  defaultBuyIn: number
  currency: Currency
  pot: number
  readOnly?: boolean
  onAddDefault: (playerId: string) => void
  onRemoveDefault: (playerId: string) => void
  onSetCount: (playerId: string, count: number) => void
  onSeatClick: (playerId: string) => void
}

export function PokerTable({
  seats,
  defaultBuyIn,
  currency,
  pot,
  readOnly = false,
  onAddDefault,
  onRemoveDefault,
  onSetCount,
  onSeatClick,
}: PokerTableProps) {
  const symbol = t.currency[currency]

  // top + bottom caps, the rest alternate down the right and left rails so the
  // two columns stay balanced (right gets the extra seat on odd counts).
  const top = seats[0] ?? null
  const bottom = seats.length > 1 ? seats[seats.length - 1] : null
  const middle = seats.slice(1, Math.max(1, seats.length - 1))

  const right: TableSeatData[] = []
  const left: TableSeatData[] = []
  middle.forEach((seat, i) => (i % 2 === 0 ? right : left).push(seat))

  const rowCount = Math.max(left.length, right.length)
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    left: left[i] ?? null,
    right: right[i] ?? null,
  }))

  const renderSeat = (seat: TableSeatData) => (
    <TableSeat
      key={seat.id}
      name={seat.name}
      buyIns={seat.buyIns}
      cashOut={seat.cashOut}
      defaultBuyIn={defaultBuyIn}
      currency={currency}
      readOnly={readOnly}
      onAddDefault={() => onAddDefault(seat.id)}
      onRemoveDefault={() => onRemoveDefault(seat.id)}
      onSetCount={(count) => onSetCount(seat.id, count)}
      onClick={() => onSeatClick(seat.id)}
    />
  )

  return (
    <div className="relative mx-auto w-full max-w-[340px] min-h-[240px] py-3">
      {/* Felt + gold rail — a contained oval table */}
      <div className="absolute inset-0 rounded-full p-1.5 bg-gradient-to-b from-[#caa85a] via-[#9a7c3a] to-[#6b5421] shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <div className="h-full w-full rounded-full border border-black/40 bg-[radial-gradient(ellipse_at_50%_38%,#56565d_0%,#3a3a40_52%,#26262b_100%)] shadow-[inset_0_2px_22px_rgba(0,0,0,0.45)]" />
      </div>

      {/* Center pot — sits behind the seats, which hug the rails */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-4 text-center">
        <p className="text-[10px] uppercase tracking-wide text-accent/70">
          {t.game.totalPot}
        </p>
        <p className="text-xl font-bold text-accent tabular-nums" dir="ltr">
          {symbol}{pot}
        </p>
        <p className="mt-0.5 text-[11px] text-[#dcdce0]/80">
          {t.game.activePlayers}: {seats.length}
        </p>
      </div>

      {/* Seats */}
      <div className="relative z-10 grid grid-cols-2 gap-x-1 gap-y-2 px-1">
        {top && <div className="col-span-2 flex justify-center">{renderSeat(top)}</div>}

        {rows.map((row, i) => (
          <div key={i} className="contents">
            <div className="flex justify-start">{row.left && renderSeat(row.left)}</div>
            <div className="flex justify-end">{row.right && renderSeat(row.right)}</div>
          </div>
        ))}

        {bottom && (
          <div className="col-span-2 flex justify-center">{renderSeat(bottom)}</div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

type TableSeatProps = {
  name: string
  buyIns: BuyIn[]
  cashOut: CashOut | null
  defaultBuyIn: number
  currency: Currency
  readOnly: boolean
  onAddDefault: () => void
  onRemoveDefault: () => void
  onSetCount: (count: number) => void
  onClick: () => void
}

function TableSeat({
  name,
  buyIns,
  cashOut,
  defaultBuyIn,
  currency,
  readOnly,
  onAddDefault,
  onRemoveDefault,
  onSetCount,
  onClick,
}: TableSeatProps) {
  const symbol = t.currency[currency]
  const totalBuyIn = buyIns.reduce((s, b) => s + b.amount, 0)
  const defaultCount = buyIns.filter((b) => b.amount === defaultBuyIn).length
  const initial = name.trim().charAt(0) || '?'
  const isCashedOut = cashOut != null
  const net = isCashedOut ? cashOut.amount - totalBuyIn : 0

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
      if (parsed !== defaultCount) onSetCount(parsed)
    } else {
      setCountInput(String(defaultCount))
    }
  }

  const stepBtn =
    'flex items-center justify-center w-7 h-7 rounded-md text-base leading-none font-medium transition-transform active:scale-90'

  return (
    <div className="flex w-[96px] max-w-full flex-col items-center gap-1">
      {/* Tap avatar + name to open the player manage sheet */}
      <button
        type="button"
        onClick={onClick}
        disabled={readOnly}
        className="flex max-w-full flex-col items-center gap-1 rounded-2xl px-1 transition-opacity disabled:cursor-default enabled:active:opacity-70"
      >
        {/* Avatar with gold frame */}
        <div
          className={`rounded-full p-[1.5px] bg-gradient-to-b from-[#e0c476] to-[#9a7c3a] shadow-[0_0_6px_rgba(201,168,76,0.4)] ${
            isCashedOut ? 'opacity-60 grayscale' : ''
          }`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-surface-elevated to-surface border border-black/40">
            <span className="text-[15px] font-semibold leading-none text-accent">
              {initial}
            </span>
          </div>
        </div>

        {/* Name · total */}
        <div className="flex max-w-full items-center gap-1 rounded-full border border-border bg-surface/90 px-2 py-0.5 backdrop-blur-sm">
          <span className="truncate text-[11px] font-semibold text-text-primary">
            {name}
          </span>
          <span className="shrink-0 text-[10px] text-text-muted/60" aria-hidden>
            ·
          </span>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-accent" dir="ltr">
            {symbol}{totalBuyIn}
          </span>
        </div>

        {/* Cashed-out badge */}
        {isCashedOut && (
          <div className="flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-0.5 text-[10px]">
            <span className="text-text-muted">{t.game.cashedOut}</span>
            <span
              className={`font-semibold tabular-nums ${
                net >= 0 ? 'text-positive' : 'text-negative'
              }`}
              dir="ltr"
            >
              {net >= 0 ? '+' : '−'}{symbol}{Math.abs(net)}
            </span>
          </div>
        )}
      </button>

      {/* Stepper — hidden for non-managers (read-only view) */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface/90 p-0.5 backdrop-blur-sm">
          <button
            type="button"
            onClick={onRemoveDefault}
            disabled={defaultCount === 0}
            className={`${stepBtn} text-text-primary disabled:opacity-30`}
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
            onFocus={(e) => e.currentTarget.select()}
            onBlur={commitCount}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="h-7 w-7 rounded-md bg-surface-elevated text-center text-[13px] font-semibold tabular-nums text-text-primary border border-accent/40 border-dashed cursor-text focus:outline-none focus:border-solid focus:border-accent focus:ring-1 focus:ring-accent/40 focus:bg-accent/10"
            dir="ltr"
            title={t.game.editBuyInCount}
            aria-label={t.game.buyInCount}
          />
          <button
            type="button"
            onClick={onAddDefault}
            className={`${stepBtn} bg-accent/15 text-accent`}
            aria-label={t.game.addBuyIn}
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
