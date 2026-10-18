'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { t } from '@/lib/i18n/dictionary'
import { resolveSeatNames } from '@/lib/display/seat-names'
import { PlayerAvatar } from '@/components/games/player-avatar'
import { useSeatArrange } from '@/hooks/use-seat-arrange'
import { hashString as hashSeed } from '@/lib/display/avatar'
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
  /** Commit a new seating order. Omit to leave the table unarrangeable. */
  onReorder?: (orderedPlayerIds: string[]) => void
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
  onReorder,
}: PokerTableProps) {
  const symbol = t.currency[currency]

  const seatIds = useMemo(() => seats.map((s) => s.id), [seats])
  const noopReorder = useCallback(() => {}, [])
  const {
    state: arrange,
    registerSeat,
    onSeatPointerDown,
    cancelPress,
    toggleArranging,
    stopArranging,
    suppressNextClick,
  } = useSeatArrange({
    orderedIds: seatIds,
    onReorder: onReorder ?? noopReorder,
    disabled: readOnly || !onReorder,
  })

  const canArrange = !readOnly && !!onReorder && seats.length > 1

  // Seats are ~96px wide, so a full "Roi Ben Yaacov" used to be truncated by
  // the amount next to it ("₪1050 · ...ti"). Show the first name instead,
  // widened only as far as it takes to keep two seats apart.
  const seatLabels = useMemo(() => resolveSeatNames(seats), [seats])

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

  const renderSeat = (seat: TableSeatData) => {
    const index = seatIds.indexOf(seat.id)
    const isDragging = arrange.draggingId === seat.id
    return (
      <TableSeat
        key={seat.id}
        ref={(el) => registerSeat(seat.id, el)}
        playerId={seat.id}
        name={seatLabels.get(seat.id) ?? seat.name}
        fullName={seat.name}
        buyIns={seat.buyIns}
        cashOut={seat.cashOut}
        defaultBuyIn={defaultBuyIn}
        currency={currency}
        readOnly={readOnly}
        arranging={arrange.arranging}
        dragging={isDragging}
        dropTarget={
          arrange.draggingId !== null &&
          !isDragging &&
          arrange.dropIndex === index
        }
        dragOffset={isDragging ? arrange.dragOffset : null}
        onPointerDown={(e) => canArrange && onSeatPointerDown(seat.id, e)}
        onPointerLeave={cancelPress}
        onAddDefault={() => onAddDefault(seat.id)}
        onRemoveDefault={() => onRemoveDefault(seat.id)}
        onSetCount={(count) => onSetCount(seat.id, count)}
        onClick={() => {
          // A long press that turned into a drag must not also open the
          // manage sheet when the finger comes up.
          if (suppressNextClick || arrange.arranging) return
          onSeatClick(seat.id)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col items-center">
      {canArrange && (
        <div className="mb-1 flex w-full max-w-[340px] justify-end px-1">
          <button
            type="button"
            onClick={arrange.arranging ? stopArranging : toggleArranging}
            aria-pressed={arrange.arranging}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
              arrange.arranging
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border bg-surface text-text-muted active:bg-surface-elevated'
            }`}
          >
            <ArrangeIcon />
            {arrange.arranging ? t.game.arrangeDone : t.game.arrangeSeats}
          </button>
        </div>
      )}

      {arrange.arranging && (
        <p className="mb-2 px-4 text-center text-[11px] text-text-muted">
          {t.game.arrangeHint}
        </p>
      )}

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
    </div>
  )
}

function ArrangeIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      <path d="M8 2v12M2 8h12" />
      <path d="M8 2 6 4M8 2l2 2M8 14l-2-2M8 14l2-2" />
      <path d="M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2" />
    </svg>
  )
}

// ---------------------------------------------------------------------------

type TableSeatProps = {
  /** Seeds the seat's poker character. */
  playerId: string
  /** The table is in arrange mode — seats jiggle and steppers stand down. */
  arranging: boolean
  /** This seat is the one being held. */
  dragging: boolean
  /** The held seat would land here on release. */
  dropTarget: boolean
  /** Live px offset while held, else null. */
  dragOffset: { x: number; y: number } | null
  onPointerDown: (e: React.PointerEvent) => void
  onPointerLeave: () => void
  /** Short label shown on the seat — usually just the first name. */
  name: string
  /** Full name, kept for the accessible label and the native tooltip. */
  fullName: string
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

const TableSeat = forwardRef<HTMLDivElement, TableSeatProps>(function TableSeat(
  {
    playerId,
    name,
    fullName,
    buyIns,
    cashOut,
    defaultBuyIn,
    currency,
    readOnly,
    arranging,
    dragging,
    dropTarget,
    dragOffset,
    onPointerDown,
    onPointerLeave,
    onAddDefault,
    onRemoveDefault,
    onSetCount,
    onClick,
  },
  ref,
) {
  const symbol = t.currency[currency]
  const totalBuyIn = buyIns.reduce((s, b) => s + b.amount, 0)
  const defaultCount = buyIns.filter((b) => b.amount === defaultBuyIn).length
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
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerLeave={onPointerLeave}
      className={`flex w-[96px] max-w-full flex-col items-center gap-1 ${
        arranging ? 'seat-jiggle touch-none select-none' : ''
      } ${dragging ? 'z-50 scale-110 opacity-90' : ''} ${
        dropTarget ? 'rounded-2xl ring-2 ring-accent/70' : ''
      }`}
      style={
        dragging && dragOffset
          ? {
              transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.1)`,
              // Follow the finger exactly — no easing lag while dragging.
              transition: 'none',
              animation: 'none',
            }
          : // Desynchronise the wobble so the seats do not shake in lockstep.
            ({
              '--jiggle-delay': `${(hashSeed(playerId) % 7) * 0.04}s`,
            } as React.CSSProperties)
      }
    >
      {/* Tap avatar + name to open the player manage sheet */}
      <button
        type="button"
        onClick={onClick}
        disabled={readOnly}
        title={fullName}
        aria-label={fullName}
        className="flex w-full flex-col items-center gap-1 rounded-2xl transition-opacity disabled:cursor-default enabled:active:opacity-70"
      >
        {/* Avatar with gold frame */}
        <div className="rounded-full p-[1.5px] bg-gradient-to-b from-[#e0c476] to-[#9a7c3a] shadow-[0_0_6px_rgba(201,168,76,0.4)]">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-black/40">
            <PlayerAvatar playerId={playerId} size={36} muted={isCashedOut} />
          </div>
        </div>

        {/* Name over total — stacked (not side by side) so the name gets the
            full seat width and long names wrap instead of being clipped. */}
        <div className="flex w-full flex-col items-center gap-0.5 rounded-2xl border border-border bg-surface/90 px-1.5 py-1 backdrop-blur-sm">
          <span className="w-full break-words text-center text-[11px] font-semibold leading-tight text-text-primary">
            {name}
          </span>
          <span
            className="text-[11px] font-semibold leading-none tabular-nums text-accent"
            dir="ltr"
          >
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
      {!readOnly && !arranging && (
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
})
