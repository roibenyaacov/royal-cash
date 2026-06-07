'use client'

import { useState, useTransition } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { RANKS, SUITS, cardRank, cardSuit, makeCard } from '@/lib/poker/evaluator'
import { runSimulation, type GameType, type RunOuts, type SimResult } from '@/lib/poker/simulation'

// ─── Playing card ────────────────────────────────────────────────────────────

function FilledCard({ card, onRemove }: { card: number; onRemove: () => void }) {
  const rank = cardRank(card)
  const suit = cardSuit(card)
  const isRed = suit === 1 || suit === 2

  return (
    <button
      type="button"
      onClick={onRemove}
      className="relative active:scale-90 transition-transform"
      style={{ width: 48, height: 68, flexShrink: 0 }}
    >
      <div
        className="absolute inset-0 rounded flex flex-col items-center justify-center"
        style={{
          background: '#ffffff',
          boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
          color: isRed ? '#dc2626' : '#111111',
        }}
      >
        <span className="text-xl font-bold leading-none">{RANKS[rank]}</span>
        <span className="text-lg leading-none mt-0.5">{SUITS[suit]}</span>
      </div>
    </button>
  )
}

function EmptySlot({ onTap }: { onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="active:scale-90 transition-transform flex items-center justify-center"
      style={{
        width: 48,
        height: 68,
        flexShrink: 0,
        borderRadius: 4,
        border: '1.5px dashed rgba(255,255,255,0.25)',
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.35)',
        fontSize: 24,
        fontWeight: 300,
      }}
    >
      +
    </button>
  )
}

// ─── Card picker (bottom sheet content) ──────────────────────────────────────

function CardGrid({
  selected,
  onSelect,
}: {
  selected: Set<number>
  onSelect: (card: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Rank header */}
      <div className="flex gap-1 ps-7">
        {RANKS.slice().reverse().map((r) => (
          <div key={r} className="flex-1 text-center text-[10px] text-text-muted">{r}</div>
        ))}
      </div>

      {/* Suit rows: ♠ ♥ ♦ ♣ */}
      {[3, 2, 1, 0].map((suit) => (
        <div key={suit} className="flex items-center gap-1">
          <span
            className="text-sm w-6 text-center shrink-0"
            style={{ color: suit >= 2 ? '#f87171' : '#e2e2e2' }}
          >
            {SUITS[suit]}
          </span>
          {Array.from({ length: 13 }, (_, i) => 12 - i).map((rank) => {
            const card = makeCard(rank, suit)
            const isSel = selected.has(card)
            const isRed = suit === 1 || suit === 2

            return (
              <button
                key={card}
                type="button"
                disabled={isSel}
                onClick={() => onSelect(card)}
                className="flex-1 aspect-square rounded flex items-center justify-center text-[11px] font-bold transition-all active:scale-90"
                style={{
                  background: isSel ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.06)',
                  border: isSel ? '1.5px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  color: isSel ? 'rgba(201,168,76,0.4)' : isRed ? '#f87171' : '#e2e2e2',
                  opacity: isSel ? 0.5 : 1,
                }}
              >
                {RANKS[rank]}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Results glass panel ──────────────────────────────────────────────────────

function ResultsPanel({ result }: { result: SimResult }) {
  const pct = (n: number) => (n * 100).toFixed(1)

  return (
    <div
      className="w-full rounded-xl px-4 py-4 flex items-center"
      style={{
        background: 'rgba(18,18,18,0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex-1 flex flex-col items-center border-e border-border/50">
        <span className="text-[11px] uppercase tracking-widest text-text-muted mb-1">{t.tools.win}</span>
        <div className="flex items-end leading-none">
          <span className="text-4xl font-bold text-positive">{pct(result.win)}</span>
          <span className="text-xl text-positive/70 mb-0.5 ms-0.5">%</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center border-e border-border/50">
        <span className="text-[11px] uppercase tracking-widest text-text-muted mb-1">{t.tools.tie}</span>
        <div className="flex items-end leading-none">
          <span className="text-4xl font-bold text-text-secondary">{pct(result.tie)}</span>
          <span className="text-xl text-text-muted mb-0.5 ms-0.5">%</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center">
        <span className="text-[11px] uppercase tracking-widest text-text-muted mb-1">{t.tools.lose}</span>
        <div className="flex items-end leading-none">
          <span className="text-4xl font-bold text-negative">{pct(result.lose)}</span>
          <span className="text-xl text-negative/70 mb-0.5 ms-0.5">%</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type SlotRef = { section: 'hero' | 'board' | 'villain'; index: number }

export function OddsCalculator() {
  const [gameType, setGameType] = useState<GameType>('holdem')
  const [runOuts, setRunOuts] = useState<RunOuts>(1)
  const [showVillain, setShowVillain] = useState(false)

  const holeSize = gameType === 'omaha' ? 4 : 2

  const [heroSlots, setHeroSlots] = useState<(number | null)[]>([null, null])
  const [boardSlots, setBoardSlots] = useState<(number | null)[]>([null, null, null, null, null])
  const [villainSlots, setVillainSlots] = useState<(number | null)[]>([null, null])

  const [activeSlot, setActiveSlot] = useState<SlotRef | null>(null)
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Sync slot arrays when game type changes
  function switchGameType(gt: GameType) {
    setGameType(gt)
    const newHole = gt === 'omaha' ? 4 : 2
    setHeroSlots(Array(newHole).fill(null))
    setVillainSlots(Array(newHole).fill(null))
    setResult(null)
    setError('')
  }

  const allUsed = new Set<number>([
    ...heroSlots.filter((c): c is number => c !== null),
    ...boardSlots.filter((c): c is number => c !== null),
    ...villainSlots.filter((c): c is number => c !== null),
  ])

  function getSlotsFor(section: 'hero' | 'board' | 'villain') {
    if (section === 'hero') return heroSlots
    if (section === 'board') return boardSlots
    return villainSlots
  }

  function setSlots(section: 'hero' | 'board' | 'villain', slots: (number | null)[]) {
    if (section === 'hero') setHeroSlots(slots)
    else if (section === 'board') setBoardSlots(slots)
    else setVillainSlots(slots)
  }

  function openPicker(section: 'hero' | 'board' | 'villain', index: number) {
    setActiveSlot({ section, index })
  }

  function removeCard(section: 'hero' | 'board' | 'villain', index: number) {
    const slots = [...getSlotsFor(section)]
    slots[index] = null
    setSlots(section, slots)
    setResult(null)
  }

  function placeCard(card: number) {
    if (!activeSlot) return
    const slots = [...getSlotsFor(activeSlot.section)]
    slots[activeSlot.index] = card
    setSlots(activeSlot.section, slots)
    setActiveSlot(null)
    setResult(null)
    setError('')
  }

  function clearAll() {
    setHeroSlots(Array(holeSize).fill(null))
    setBoardSlots(Array(5).fill(null))
    setVillainSlots(Array(holeSize).fill(null))
    setResult(null)
    setError('')
  }

  function calculate() {
    const heroCards = heroSlots.filter((c): c is number => c !== null)
    if (heroCards.length < holeSize) {
      setError(gameType === 'omaha' ? t.tools.needOmahaCards : t.tools.needMoreCards)
      return
    }
    setError('')

    startTransition(() => {
      const boardCards = boardSlots.filter((c): c is number => c !== null)
      const villainCards = villainSlots.filter((c): c is number => c !== null)
      const vHole = showVillain && villainCards.length === holeSize ? villainCards : null

      const res = runSimulation({
        heroHole: heroCards,
        villainHole: vHole,
        board: boardCards,
        gameType,
        runOuts,
        iterations: 10000,
      })
      setResult(res)
    })
  }

  function renderSlotRow(
    slots: (number | null)[],
    section: 'hero' | 'board' | 'villain',
    maxCount: number,
  ) {
    return slots.slice(0, maxCount).map((card, i) =>
      card !== null ? (
        <FilledCard key={i} card={card} onRemove={() => removeCard(section, i)} />
      ) : (
        <EmptySlot key={i} onTap={() => openPicker(section, i)} />
      ),
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex gap-3">
        <div className="flex-1">
          <p className="text-[11px] text-text-muted mb-1.5 uppercase tracking-wide">{t.tools.gameType}</p>
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(['holdem', 'omaha'] as GameType[]).map((gt) => (
              <button
                key={gt}
                type="button"
                onClick={() => switchGameType(gt)}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  gameType === gt
                    ? 'bg-accent text-bg'
                    : 'bg-surface-elevated text-text-secondary'
                }`}
              >
                {gt === 'holdem' ? "Hold'em" : 'Omaha'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-text-muted mb-1.5 uppercase tracking-wide">{t.tools.runOuts}</p>
          <div className="flex rounded-lg overflow-hidden border border-border">
            {([1, 2, 3] as RunOuts[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRunOuts(r)}
                className={`w-10 py-1.5 text-xs font-medium transition-colors ${
                  runOuts === r
                    ? 'bg-accent text-bg'
                    : 'bg-surface-elevated text-text-secondary'
                }`}
              >
                {r}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Poker table */}
      <div
        className="w-full flex flex-col items-center justify-between py-6 px-4 gap-4"
        style={{
          borderRadius: 80,
          background: 'radial-gradient(ellipse at center, #1e1e1e 0%, #0a0a0a 100%)',
          border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)',
          minHeight: 300,
        }}
      >
        {/* Villain / Opponent */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted uppercase tracking-widest">יריב</span>
            {!showVillain ? (
              <button
                type="button"
                onClick={() => setShowVillain(true)}
                className="text-[10px] text-accent border border-accent/40 rounded-full px-2 py-0.5"
              >
                + הוסף
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setShowVillain(false); setVillainSlots(Array(holeSize).fill(null)) }}
                className="text-[10px] text-text-muted"
              >
                הסר
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {showVillain
              ? renderSlotRow(villainSlots, 'villain', holeSize)
              : Array(holeSize).fill(null).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 48, height: 68, flexShrink: 0,
                      borderRadius: 4,
                      border: '1px dashed rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  />
                ))}
          </div>
        </div>

        {/* Board */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-text-muted uppercase tracking-widest">לוח</span>
          <div className="flex gap-1.5">
            {/* Flop: slots 0-2 */}
            <div className="flex gap-1.5">
              {renderSlotRow(boardSlots, 'board', 3)}
            </div>
            {/* Turn + River */}
            <div
              className="w-px self-stretch mx-0.5"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            <div className="flex gap-1.5">
              {boardSlots.slice(3).map((card, i) =>
                card !== null ? (
                  <FilledCard key={i + 3} card={card} onRemove={() => removeCard('board', i + 3)} />
                ) : (
                  <EmptySlot key={i + 3} onTap={() => openPicker('board', i + 3)} />
                ),
              )}
            </div>
          </div>
        </div>

        {/* Hero hand */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {renderSlotRow(heroSlots, 'hero', holeSize)}
          </div>
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
            הקלפים שלי
          </span>
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-negative text-center">{error}</p>}

      {/* Results */}
      {result && <ResultsPanel result={result} />}

      {/* Actions */}
      <button
        type="button"
        onClick={calculate}
        disabled={isPending}
        className="w-full h-14 rounded-xl font-semibold text-base transition-opacity active:scale-95"
        style={{
          background: isPending ? 'rgba(201,168,76,0.6)' : 'var(--color-accent)',
          color: '#111111',
        }}
      >
        {isPending ? t.tools.calculating : t.tools.calculate}
      </button>

      <button
        type="button"
        onClick={clearAll}
        className="w-full py-2 text-sm text-text-muted active:text-text-secondary transition-colors"
      >
        {t.tools.clearAll}
      </button>

      {/* Card picker sheet */}
      <BottomSheet
        open={activeSlot !== null}
        onClose={() => setActiveSlot(null)}
        title={t.tools.selectCards}
      >
        <CardGrid
          selected={allUsed}
          onSelect={placeCard}
        />
        <p className="text-xs text-text-muted text-center mt-3">{t.tools.iterations}</p>
      </BottomSheet>
    </div>
  )
}
