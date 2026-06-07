'use client'

import { useState, useTransition, useRef, useEffect, useMemo } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { RANKS, SUITS, cardRank, cardSuit, makeCard } from '@/lib/poker/evaluator'
import { runSimulation, type GameType, type RunOuts, type SimResult } from '@/lib/poker/simulation'

const MAX_VILLAINS = 4
const CARD_ASPECT = 68 / 48
const CARD_MAX_W = 48
const CARD_MIN_W = 28
const CARD_GAP = 4
const VILLAIN_GAP = 10

type CardSize = {
  w: number
  h: number
  rankClass: string
  suitClass: string
  plusSize: number
}

function defaultCardSize(): CardSize {
  return { w: 48, h: 68, rankClass: 'text-xl', suitClass: 'text-lg', plusSize: 24 }
}

function computeVillainLayout(
  villainCount: number,
  holeSize: number,
  containerWidth: number,
): { card: CardSize; perRow: number } {
  if (villainCount === 0) return { card: defaultCardSize(), perRow: 0 }

  const available = Math.max(containerWidth - 8, 160)

  for (let perRow = villainCount; perRow >= 1; perRow--) {
    const cardGaps = perRow * Math.max(holeSize - 1, 0) * CARD_GAP
    const villainGaps = Math.max(perRow - 1, 0) * VILLAIN_GAP
    const cardW = (available - cardGaps - villainGaps) / (perRow * holeSize)

    if (cardW >= CARD_MIN_W) {
      const w = Math.min(CARD_MAX_W, Math.floor(cardW))
      const h = Math.round(w * CARD_ASPECT)
      return {
        perRow,
        card: {
          w,
          h,
          rankClass: w >= 42 ? 'text-xl' : w >= 36 ? 'text-base' : w >= 32 ? 'text-sm' : 'text-xs',
          suitClass: w >= 42 ? 'text-lg' : w >= 36 ? 'text-sm' : 'text-xs',
          plusSize: w >= 42 ? 24 : w >= 36 ? 20 : 16,
        },
      }
    }
  }

  const w = CARD_MIN_W
  const h = Math.round(w * CARD_ASPECT)
  const groupWidth = holeSize * w + Math.max(holeSize - 1, 0) * CARD_GAP
  const perRow = Math.max(
    1,
    Math.min(
      villainCount,
      Math.floor((available + VILLAIN_GAP) / (groupWidth + VILLAIN_GAP)),
    ),
  )

  return {
    perRow,
    card: {
      w,
      h,
      rankClass: 'text-xs',
      suitClass: 'text-xs',
      plusSize: 14,
    },
  }
}

function chunkIndices(count: number, perRow: number): number[][] {
  const rows: number[][] = []
  for (let i = 0; i < count; i += perRow) {
    rows.push(Array.from({ length: Math.min(perRow, count - i) }, (_, j) => i + j))
  }
  return rows
}

// ─── Playing card ────────────────────────────────────────────────────────────

function FilledCard({
  card,
  onRemove,
  size = defaultCardSize(),
}: {
  card: number
  onRemove: () => void
  size?: CardSize
}) {
  const rank = cardRank(card)
  const suit = cardSuit(card)
  const isRed = suit === 1 || suit === 2

  return (
    <button
      type="button"
      onClick={onRemove}
      className="relative active:scale-90 transition-transform shrink-0"
      style={{ width: size.w, height: size.h }}
    >
      <div
        className="absolute inset-0 rounded flex flex-col items-center justify-center"
        style={{
          background: '#ffffff',
          boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
          color: isRed ? '#dc2626' : '#111111',
        }}
      >
        <span className={`${size.rankClass} font-bold leading-none`}>{RANKS[rank]}</span>
        <span className={`${size.suitClass} leading-none mt-0.5`}>{SUITS[suit]}</span>
      </div>
    </button>
  )
}

function EmptySlot({
  onTap,
  size = defaultCardSize(),
}: {
  onTap: () => void
  size?: CardSize
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="active:scale-90 transition-transform flex items-center justify-center shrink-0"
      style={{
        width: size.w,
        height: size.h,
        borderRadius: 4,
        border: '1.5px dashed rgba(255,255,255,0.25)',
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.35)',
        fontSize: size.plusSize,
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
      <div className="flex gap-1 ps-7">
        {RANKS.slice().reverse().map((r) => (
          <div key={r} className="flex-1 text-center text-[10px] text-text-muted">{r}</div>
        ))}
      </div>

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

type SlotRef =
  | { section: 'hero' | 'board'; index: number }
  | { section: 'villain'; villainIndex: number; index: number }

function emptyVillainRow(holeSize: number): (number | null)[] {
  return Array(holeSize).fill(null)
}

export function OddsCalculator() {
  const [gameType, setGameType] = useState<GameType>('holdem')
  const [runOuts, setRunOuts] = useState<RunOuts>(1)

  const holeSize = gameType === 'omaha' ? 4 : 2

  const [heroSlots, setHeroSlots] = useState<(number | null)[]>([null, null])
  const [boardSlots, setBoardSlots] = useState<(number | null)[]>([null, null, null, null, null])
  const [villains, setVillains] = useState<(number | null)[][]>([])

  const [activeSlot, setActiveSlot] = useState<SlotRef | null>(null)
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const villainsContainerRef = useRef<HTMLDivElement>(null)
  const [villainsWidth, setVillainsWidth] = useState(320)

  useEffect(() => {
    const el = villainsContainerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setVillainsWidth(width)
    })
    observer.observe(el)
    setVillainsWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  const villainLayout = useMemo(
    () => computeVillainLayout(villains.length, holeSize, villainsWidth),
    [villains.length, holeSize, villainsWidth],
  )
  const villainRows = useMemo(
    () => chunkIndices(villains.length, villainLayout.perRow || 1),
    [villains.length, villainLayout.perRow],
  )

  function switchGameType(gt: GameType) {
    setGameType(gt)
    const newHole = gt === 'omaha' ? 4 : 2
    setHeroSlots(Array(newHole).fill(null))
    setVillains(villains.map(() => emptyVillainRow(newHole)))
    setResult(null)
    setError('')
  }

  const allUsed = new Set<number>([
    ...heroSlots.filter((c): c is number => c !== null),
    ...boardSlots.filter((c): c is number => c !== null),
    ...villains.flatMap((v) => v.filter((c): c is number => c !== null)),
  ])

  function addVillain() {
    if (villains.length >= MAX_VILLAINS) return
    setVillains([...villains, emptyVillainRow(holeSize)])
    setResult(null)
  }

  function removeVillain(villainIndex: number) {
    setVillains(villains.filter((_, i) => i !== villainIndex))
    setResult(null)
  }

  function openPicker(section: SlotRef['section'], index: number, villainIndex?: number) {
    if (section === 'villain' && villainIndex !== undefined) {
      setActiveSlot({ section: 'villain', villainIndex, index })
    } else if (section === 'hero' || section === 'board') {
      setActiveSlot({ section, index })
    }
  }

  function removeCard(ref: SlotRef) {
    if (ref.section === 'hero') {
      const slots = [...heroSlots]
      slots[ref.index] = null
      setHeroSlots(slots)
    } else if (ref.section === 'board') {
      const slots = [...boardSlots]
      slots[ref.index] = null
      setBoardSlots(slots)
    } else if (ref.section === 'villain') {
      const rows = villains.map((row) => [...row])
      rows[ref.villainIndex][ref.index] = null
      setVillains(rows)
    }
    setResult(null)
  }

  function placeCard(card: number) {
    if (!activeSlot) return

    if (activeSlot.section === 'hero') {
      const slots = [...heroSlots]
      slots[activeSlot.index] = card
      setHeroSlots(slots)
    } else if (activeSlot.section === 'board') {
      const slots = [...boardSlots]
      slots[activeSlot.index] = card
      setBoardSlots(slots)
    } else if (activeSlot.section === 'villain') {
      const rows = villains.map((row) => [...row])
      rows[activeSlot.villainIndex][activeSlot.index] = card
      setVillains(rows)
    }

    setActiveSlot(null)
    setResult(null)
    setError('')
  }

  function clearAll() {
    setHeroSlots(Array(holeSize).fill(null))
    setBoardSlots(Array(5).fill(null))
    setVillains([])
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
      const villainHoles =
        villains.length > 0
          ? villains.map((row) => {
              const cards = row.filter((c): c is number => c !== null)
              return cards.length === holeSize ? cards : null
            })
          : undefined

      const res = runSimulation({
        heroHole: heroCards,
        villainHoles,
        board: boardCards,
        gameType,
        runOuts,
        iterations: 10000,
      })
      setResult(res)
    })
  }

  function renderHeroOrBoardRow(
    slots: (number | null)[],
    section: 'hero' | 'board',
    maxCount: number,
  ) {
    return slots.slice(0, maxCount).map((card, i) => {
      const ref: SlotRef = { section, index: i }
      return card !== null ? (
        <FilledCard key={i} card={card} onRemove={() => removeCard(ref)} />
      ) : (
        <EmptySlot key={i} onTap={() => openPicker(section, i)} />
      )
    })
  }

  function renderVillainRow(villainSlots: (number | null)[], villainIndex: number, size: CardSize) {
    return villainSlots.slice(0, holeSize).map((card, i) => {
      const ref: SlotRef = { section: 'villain', villainIndex, index: i }
      return card !== null ? (
        <FilledCard key={i} card={card} size={size} onRemove={() => removeCard(ref)} />
      ) : (
        <EmptySlot key={i} size={size} onTap={() => openPicker('villain', i, villainIndex)} />
      )
    })
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
        className="w-full flex flex-col items-center justify-between py-5 px-4 gap-3"
        style={{
          borderRadius: 80,
          background: 'radial-gradient(ellipse at center, #1e1e1e 0%, #0a0a0a 100%)',
          border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)',
          minHeight: 300,
        }}
      >
        {/* Villains */}
        <div ref={villainsContainerRef} className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-xs text-text-muted uppercase tracking-widest">{t.tools.villainCards}</span>
            {villains.length < MAX_VILLAINS && (
              <button
                type="button"
                onClick={addVillain}
                className="text-[10px] text-accent border border-accent/40 rounded-full px-2 py-0.5"
              >
                + {t.tools.addVillain}
              </button>
            )}
            {villains.length > 0 && (
              <span className="text-[10px] text-text-muted">
                {villains.length}/{MAX_VILLAINS}
              </span>
            )}
          </div>

          {villains.length === 0 ? (
            <div className="flex gap-2">
              {Array(holeSize).fill(null).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 48,
                    height: 68,
                    flexShrink: 0,
                    borderRadius: 4,
                    border: '1px dashed rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
              {villainRows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex flex-row items-end justify-center w-full"
                  style={{ gap: VILLAIN_GAP }}
                >
                  {row.map((villainIndex) => (
                    <div key={villainIndex} className="flex flex-col items-center gap-1 shrink-0">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-[9px] text-text-muted uppercase tracking-wide">
                          {t.tools.villainNumber} {villainIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVillain(villainIndex)}
                          className="text-[9px] text-text-muted hover:text-negative transition-colors leading-none"
                          aria-label={t.tools.removeVillain}
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex" style={{ gap: CARD_GAP }}>
                        {renderVillainRow(villains[villainIndex], villainIndex, villainLayout.card)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Board */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-text-muted uppercase tracking-widest">{t.tools.boardCards}</span>
          <div className="flex gap-1.5">
            <div className="flex gap-1.5">
              {renderHeroOrBoardRow(boardSlots, 'board', 3)}
            </div>
            <div
              className="w-px self-stretch mx-0.5"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            <div className="flex gap-1.5">
              {boardSlots.slice(3).map((card, i) => {
                const ref: SlotRef = { section: 'board', index: i + 3 }
                return card !== null ? (
                  <FilledCard key={i + 3} card={card} onRemove={() => removeCard(ref)} />
                ) : (
                  <EmptySlot key={i + 3} onTap={() => openPicker('board', i + 3)} />
                )
              })}
            </div>
          </div>
        </div>

        {/* Hero hand */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {renderHeroOrBoardRow(heroSlots, 'hero', holeSize)}
          </div>
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
            {t.tools.myCards}
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-negative text-center">{error}</p>}

      {result && <ResultsPanel result={result} />}

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

      <BottomSheet
        open={activeSlot !== null}
        onClose={() => setActiveSlot(null)}
        title={t.tools.selectCards}
      >
        <CardGrid selected={allUsed} onSelect={placeCard} />
        <p className="text-xs text-text-muted text-center mt-3">{t.tools.iterations}</p>
      </BottomSheet>
    </div>
  )
}
