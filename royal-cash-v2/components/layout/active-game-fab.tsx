'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from '@/lib/i18n/locale-context'
import { createClient } from '@/lib/supabase/client'
import { getMyActiveGames } from '@/lib/db/games'

type ActiveGame = { id: string; group_id: string; name: string }
type Pos = { x: number; y: number }

const FAB_SIZE = 60
const DRAG_THRESHOLD = 6
const STORAGE_KEY = 'rc_active_game_fab_pos'

// A persistent shortcut back to the user's current game — defined simply as
// the most recently opened active game. It floats above the bottom nav across
// the app, can be dragged anywhere by touch, and hides itself while you're
// already inside that game.
export function ActiveGameFab() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLocale()
  const [games, setGames] = useState<ActiveGame[]>([])
  const [pos, setPos] = useState<Pos | null>(null)

  // Refetch on every navigation so the shortcut appears when a game starts and
  // disappears once it's closed — the query is a single indexed lookup that
  // returns games newest-first.
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    getMyActiveGames(supabase)
      .then((rows) => {
        if (!cancelled) {
          setGames(
            rows.map((g) => ({ id: g.id, group_id: g.group_id, name: g.name })),
          )
        }
      })
      .catch(() => {
        if (!cancelled) setGames([])
      })
    return () => {
      cancelled = true
    }
  }, [pathname])

  // Restore the last dragged position.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPos(JSON.parse(raw) as Pos)
      }
    } catch {
      // ignore malformed storage
    }
  }, [])

  // Keep it on-screen if the viewport changes (rotation / resize).
  useEffect(() => {
    function onResize() {
      setPos((prev) => (prev ? clampToViewport(prev.x, prev.y) : prev))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const drag = useRef<{
    startX: number
    startY: number
    baseX: number
    baseY: number
    moved: boolean
    latest: Pos
  } | null>(null)

  // The current game = the latest one opened. Hide while we're inside it.
  const current = games[0] ?? null
  const insideCurrent =
    current != null &&
    pathname.startsWith(`/groups/${current.group_id}/games/${current.id}`)

  if (!current || insideCurrent) return null

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: rect.left,
      baseY: rect.top,
      moved: false,
      latest: { x: rect.left, y: rect.top },
    }
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    d.moved = true
    d.latest = clampToViewport(d.baseX + dx, d.baseY + dy)
    setPos(d.latest)
  }

  const handlePointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.moved) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(d.latest))
      } catch {
        // ignore storage failures
      }
    } else {
      // A tap (no real movement) jumps to the current game.
      router.push(`/groups/${current.group_id}/games/${current.id}`)
    }
  }

  const positioned = pos != null
  const style: CSSProperties = positioned
    ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : {}

  return (
    <button
      type="button"
      aria-label={`${t.game.backToActiveGame} — ${current.name}`}
      title={`${t.game.backToActiveGame} — ${current.name}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        drag.current = null
      }}
      style={style}
      className={`fixed z-40 touch-none select-none active:scale-95 transition-transform ${
        positioned
          ? ''
          : 'end-4 bottom-[calc(80px+env(safe-area-inset-bottom))]'
      }`}
    >
      <span className="relative block rounded-full p-[2px] bg-gradient-to-b from-[#e0c476] to-[#9a7c3a] shadow-[0_6px_20px_rgba(0,0,0,0.55)]">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[radial-gradient(ellipse_at_50%_36%,#3a3a40_0%,#26262b_100%)] border border-black/40">
          <SpadeIcon />
        </span>

        {/* Solid "active" indicator */}
        <span className="absolute -top-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-positive border-2 border-bg" />
      </span>
    </button>
  )
}

function clampToViewport(x: number, y: number): Pos {
  const maxX = window.innerWidth - FAB_SIZE - 8
  const maxY = window.innerHeight - FAB_SIZE - 8
  return {
    x: Math.min(Math.max(8, x), Math.max(8, maxX)),
    y: Math.min(Math.max(8, y), Math.max(8, maxY)),
  }
}

function SpadeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-7 h-7 text-accent"
      aria-hidden
    >
      <path d="M12 2C9 6 4 9 4 13.5C4 16 6 17.7 8.2 17.4C9.3 17.2 10.2 16.6 10.8 15.8C10.6 18 9.6 20 7.8 21H16.2C14.4 20 13.4 18 13.2 15.8C13.8 16.6 14.7 17.2 15.8 17.4C18 17.7 20 16 20 13.5C20 9 15 6 12 2Z" />
    </svg>
  )
}
