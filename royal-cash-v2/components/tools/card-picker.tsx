'use client'

import { RANKS, SUITS, SUIT_COLORS, cardRank, cardSuit, makeCard } from '@/lib/poker/evaluator'

type Props = {
  selected: number[]
  disabled?: number[]
  onToggle: (card: number) => void
  maxSelect?: number
}

export function CardPicker({ selected, disabled = [], onToggle, maxSelect }: Props) {
  const selectedSet = new Set(selected)
  const disabledSet = new Set(disabled)

  return (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(13, 1fr)' }}>
      {/* Rank headers */}
      {RANKS.slice().reverse().map((r) => (
        <div key={r} className="text-center text-[10px] text-text-muted pb-0.5">
          {r}
        </div>
      ))}

      {/* Cards: 4 suits × 13 ranks */}
      {[3, 2, 1, 0].map((suit) => // ♠ ♥ ♦ ♣ (descending display order)
        RANKS.map((_, rankIdx) => {
          // rankIdx 0=2, 12=A; we display A→2 so reverse
          const rank = 12 - rankIdx
          const card = makeCard(rank, suit)
          const isSel = selectedSet.has(card)
          const isDis = disabledSet.has(card) && !isSel
          const canSelect = !isDis && (isSel || maxSelect === undefined || selected.length < maxSelect)

          return (
            <button
              key={card}
              type="button"
              disabled={isDis || (!canSelect && !isSel)}
              onClick={() => (canSelect || isSel) && onToggle(card)}
              className={[
                'rounded aspect-square flex items-center justify-center text-[11px] font-bold leading-none transition-all select-none',
                isSel
                  ? 'ring-2 ring-accent scale-95 opacity-100'
                  : isDis || (!canSelect && !isSel)
                  ? 'opacity-20 cursor-not-allowed'
                  : 'opacity-70 hover:opacity-100 active:scale-95',
                suit >= 2 ? 'text-red-400' : 'text-text-primary',
                'bg-surface-elevated border border-border',
              ].join(' ')}
              style={isSel ? { background: '#D4AF3722', borderColor: '#D4AF37' } : {}}
            >
              {SUITS[suit]}
            </button>
          )
        }),
      )}
    </div>
  )
}

// Compact display of selected cards in a hand group
type CardDisplayProps = {
  cards: number[]
  label: string
  color?: string
  emptySlots?: number
}

export function CardDisplay({ cards, label, color = '#D4AF37', emptySlots = 0 }: CardDisplayProps) {
  const total = cards.length + emptySlots

  return (
    <div>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <div className="flex gap-1 flex-wrap">
        {cards.map((card) => {
          const suit = cardSuit(card)
          const rank = cardRank(card)
          return (
            <div
              key={card}
              className="rounded px-1.5 py-0.5 text-sm font-bold border"
              style={{ borderColor: color, background: `${color}18` }}
            >
              <span className="text-text-primary">{RANKS[rank]}</span>
              <span className={suit >= 2 ? 'text-red-400' : 'text-text-primary'}>
                {SUITS[suit]}
              </span>
            </div>
          )
        })}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="rounded px-2 py-0.5 text-sm border border-dashed border-border text-text-muted"
          >
            ?
          </div>
        ))}
      </div>
    </div>
  )
}
