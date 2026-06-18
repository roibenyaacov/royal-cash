'use client'

import { useMemo } from 'react'

export type ChartSeries = {
  playerId: string
  name: string
  data: number[] // cumulative balance per game
}

type Props = {
  series: ChartSeries[]
  currency: string
}

const COLORS = [
  '#D4AF37', // gold
  '#60a5fa', // blue
  '#34d399', // green
  '#f87171', // red
  '#a78bfa', // purple
  '#fb923c', // orange
]

const W = 320
const H = 160
const PAD = { top: 12, right: 8, bottom: 24, left: 44 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

function formatK(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function BalanceChart({ series, currency }: Props) {
  const { paths, yTicks, xCount, zeroY } = useMemo(() => {
    if (!series.length || series.every((s) => s.data.length === 0)) {
      return { paths: [], yTicks: [], xCount: 0, zeroY: PAD.top + INNER_H }
    }

    const allValues = series.flatMap((s) => s.data)
    const minVal = Math.min(0, ...allValues)
    const maxVal = Math.max(0, ...allValues)
    const range = maxVal - minVal || 1

    const maxPoints = Math.max(...series.map((s) => s.data.length))

    const toX = (i: number) => PAD.left + (i / Math.max(maxPoints - 1, 1)) * INNER_W
    const toY = (v: number) => PAD.top + INNER_H - ((v - minVal) / range) * INNER_H

    const paths = series.map((s, si) => {
      if (s.data.length === 0) return { d: '', color: COLORS[si % COLORS.length], name: s.name }
      const points = s.data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
      return {
        d: `M ${points.join(' L ')}`,
        color: COLORS[si % COLORS.length],
        name: s.name,
      }
    })

    const ySteps = 4
    const yTicks: { value: number; y: number }[] = []
    for (let i = 0; i <= ySteps; i++) {
      const value = minVal + (range * i) / ySteps
      yTicks.push({ value: Math.round(value), y: toY(value) })
    }

    return { paths, yTicks, xCount: maxPoints, zeroY: toY(0) }
  }, [series])

  if (!series.length) return null

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
        {series.map((s, i) => (
          <div key={s.playerId} className="flex items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-xs text-text-secondary truncate max-w-[80px]">{s.name}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 160 }}
        aria-hidden="true"
      >
        {/* Zero line */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={zeroY}
          y2={zeroY}
          stroke="#ffffff20"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* Y grid lines + labels */}
        {yTicks.map(({ value, y }) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke="#ffffff10"
              strokeWidth={0.5}
            />
            <text
              x={PAD.left - 4}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="#ffffff50"
            >
              {currency}{formatK(value)}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {xCount > 0 && [0, Math.floor(xCount / 2), xCount - 1]
          .filter((i, idx, arr) => arr.indexOf(i) === idx && i >= 0 && i < xCount)
          .map((i) => (
            <text
              key={i}
              x={PAD.left + (i / Math.max(xCount - 1, 1)) * INNER_W}
              y={H - 4}
              textAnchor="middle"
              fontSize={9}
              fill="#ffffff40"
            >
              {i + 1}
            </text>
          ))}

        {/* Series lines */}
        {paths.map((p, i) => (
          <path
            key={series[i].playerId}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Dots at last point */}
        {paths.map((p, i) => {
          const s = series[i]
          if (!s.data.length) return null
          const last = s.data.length - 1
          const maxPoints = Math.max(...series.map((s2) => s2.data.length))
          const x = PAD.left + (last / Math.max(maxPoints - 1, 1)) * INNER_W
          const allValues = series.flatMap((s2) => s2.data)
          const minVal = Math.min(0, ...allValues)
          const maxVal = Math.max(0, ...allValues)
          const range = maxVal - minVal || 1
          const y = PAD.top + INNER_H - ((s.data[last] - minVal) / range) * INNER_H
          return (
            <circle
              key={`dot-${series[i].playerId}`}
              cx={x}
              cy={y}
              r={2.5}
              fill={p.color}
            />
          )
        })}
      </svg>
    </div>
  )
}
