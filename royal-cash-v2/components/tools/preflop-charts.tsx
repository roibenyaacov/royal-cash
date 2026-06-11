'use client'

import { useState } from 'react'
import { t } from '@/lib/i18n/dictionary'
import {
  POSITIONS,
  POSITION_LABELS,
  RANK_LABELS,
  PREFLOP_CHARTS,
  ACTION_COLORS,
  getHandKey,
  countRaisePercent,
  type PreflopAction,
  type Position,
} from '@/lib/poker/preflop-data'

export function PreflopCharts() {
  const [position, setPosition] = useState<Position>('BTN')

  const grid = PREFLOP_CHARTS[position]
  const raisePercent = countRaisePercent(grid)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-text-muted">{t.tools.preflopDesc}</p>
      </div>

      {/* Position selector */}
      <div>
        <p className="text-xs text-text-secondary mb-1.5">{t.tools.position}</p>
        <div className="grid grid-cols-4 gap-1.5">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setPosition(pos)}
              className={`w-full px-2 py-1.5 rounded-lg text-sm border transition-colors text-center min-h-[36px] ${
                position === pos
                  ? 'bg-accent/20 border-accent text-accent'
                  : 'bg-surface-elevated border-border text-text-secondary'
              }`}
            >
              {POSITION_LABELS[pos]}
            </button>
          ))}
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          {POSITION_LABELS[position]} RFI
        </span>
        <span className="text-accent font-semibold">
          {raisePercent}% range
        </span>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {(['R', 'F'] as PreflopAction[]).map((action) => (
          <div key={action} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: ACTION_COLORS[action] }}
            />
            <span className="text-xs text-text-secondary">
              {action === 'R' ? t.tools.raise : t.tools.fold}
            </span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 280 }}>
          {/* Column headers */}
          <div
            className="grid mb-0.5"
            style={{ gridTemplateColumns: '20px repeat(13, 1fr)' }}
          >
            <div />
            {RANK_LABELS.map((r) => (
              <div key={r} className="text-center text-[10px] text-text-muted">
                {r}
              </div>
            ))}
          </div>

          {/* Rows */}
          {grid.map((row, i) => (
            <div
              key={i}
              className="grid mb-0.5"
              style={{ gridTemplateColumns: '20px repeat(13, 1fr)' }}
            >
              {/* Row header */}
              <div className="flex items-center justify-center text-[10px] text-text-muted">
                {RANK_LABELS[i]}
              </div>

              {/* Cells */}
              {row.map((action, j) => {
                const handKey = getHandKey(i, j)
                const isSuited = i < j
                const isPair = i === j

                return (
                  <div
                    key={j}
                    title={handKey}
                    className="rounded-[2px] aspect-square flex items-center justify-center"
                    style={{
                      background: ACTION_COLORS[action],
                      opacity: action === 'F' ? 0.35 : 1,
                    }}
                  >
                    <span
                      className="text-[7px] font-bold leading-none"
                      style={{
                        color: action === 'F' ? '#6b7280' : '#fff',
                        textShadow: action !== 'F' ? '0 0 3px #0006' : 'none',
                      }}
                    >
                      {isPair
                        ? RANK_LABELS[i] + RANK_LABELS[i]
                        : isSuited
                        ? RANK_LABELS[i] + RANK_LABELS[j] + 's'
                        : RANK_LABELS[j] + RANK_LABELS[i] + 'o'}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-text-muted text-center">
        s = suited · o = offsuit
      </p>
    </div>
  )
}
