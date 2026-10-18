'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Rearranging the seats, iOS-home-screen style.
//
// Built on pointer events rather than HTML5 drag-and-drop, which does not fire
// for touch on iOS Safari — and this table is used on a phone.
//
// Two ways in, as asked: a button, or a long press on any seat. A long press
// both enters arrange mode and begins that seat's drag, so holding and moving
// is one gesture rather than hold, release, then grab again.
//
// While dragging, the held seat follows the finger and the nearest other seat
// marks the drop target. Releasing splices the held player into that index and
// shifts the rest, which is the behaviour people expect from moving an app
// icon — not a two-way swap.
// ---------------------------------------------------------------------------

const LONG_PRESS_MS = 450
/** Finger slop before a press is treated as a scroll instead of a hold. */
const MOVE_CANCEL_PX = 10

type Point = { x: number; y: number }

export type SeatArrangeState = {
  arranging: boolean
  draggingId: string | null
  dropIndex: number | null
  /** Live offset for the dragged seat, in px. */
  dragOffset: Point
}

type Options = {
  /** Seat ids in their current visual order. */
  orderedIds: string[]
  /** Commit a new order. Called once per drop, only when it changed. */
  onReorder: (nextIds: string[]) => void
  /** Arranging is meaningless on a read-only table. */
  disabled?: boolean
}

export function useSeatArrange({ orderedIds, onReorder, disabled }: Options) {
  const [arranging, setArranging] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })

  // Element refs per seat, used to measure drop targets mid-drag.
  const seatRefs = useRef(new Map<string, HTMLElement | null>())
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressOrigin = useRef<Point | null>(null)
  const pressedId = useRef<string | null>(null)
  const dragStart = useRef<Point | null>(null)
  // Mirrors state so the pointer handlers, which are bound once, read fresh
  // values without being torn down and rebound on every move.
  const draggingIdRef = useRef<string | null>(null)
  const dropIndexRef = useRef<number | null>(null)
  const orderedIdsRef = useRef(orderedIds)

  useEffect(() => {
    orderedIdsRef.current = orderedIds
  }, [orderedIds])

  const registerSeat = useCallback((id: string, el: HTMLElement | null) => {
    if (el) seatRefs.current.set(id, el)
    else seatRefs.current.delete(id)
  }, [])

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    pressOrigin.current = null
    pressedId.current = null
  }, [])

  const endDrag = useCallback(() => {
    const heldId = draggingIdRef.current
    const target = dropIndexRef.current

    if (heldId && target !== null) {
      const current = orderedIdsRef.current
      const from = current.indexOf(heldId)
      if (from !== -1 && from !== target) {
        const next = [...current]
        next.splice(from, 1)
        next.splice(target, 0, heldId)
        onReorder(next)
      }
    }

    draggingIdRef.current = null
    dropIndexRef.current = null
    dragStart.current = null
    setDraggingId(null)
    setDropIndex(null)
    setDragOffset({ x: 0, y: 0 })
  }, [onReorder])

  const beginDrag = useCallback((id: string, origin: Point) => {
    draggingIdRef.current = id
    dragStart.current = origin
    const index = orderedIdsRef.current.indexOf(id)
    dropIndexRef.current = index === -1 ? null : index
    setDraggingId(id)
    setDropIndex(index === -1 ? null : index)
    setDragOffset({ x: 0, y: 0 })
  }, [])

  // Which seat is the finger currently over? Nearest centre wins, so the drop
  // target still resolves in the gaps between seats around the oval.
  const resolveDropIndex = useCallback((point: Point): number | null => {
    let bestIndex: number | null = null
    let bestDistance = Infinity

    orderedIdsRef.current.forEach((id, index) => {
      const el = seatRefs.current.get(id)
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const distance = Math.hypot(point.x - cx, point.y - cy)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = index
      }
    })

    return bestIndex
  }, [])

  // One set of window-level listeners for the whole drag, so the gesture
  // survives the finger leaving the seat it started on.
  useEffect(() => {
    if (disabled) return

    function handleMove(e: PointerEvent) {
      const point = { x: e.clientX, y: e.clientY }

      // Still deciding whether this is a hold or a scroll.
      if (pressOrigin.current && !draggingIdRef.current) {
        const moved = Math.hypot(
          point.x - pressOrigin.current.x,
          point.y - pressOrigin.current.y,
        )
        if (moved > MOVE_CANCEL_PX) clearLongPress()
        return
      }

      if (!draggingIdRef.current || !dragStart.current) return

      // Stops the page scrolling under the finger mid-drag.
      e.preventDefault()

      setDragOffset({
        x: point.x - dragStart.current.x,
        y: point.y - dragStart.current.y,
      })

      const next = resolveDropIndex(point)
      if (next !== dropIndexRef.current) {
        dropIndexRef.current = next
        setDropIndex(next)
      }
    }

    function handleUp() {
      clearLongPress()
      if (draggingIdRef.current) endDrag()
    }

    // passive: false so preventDefault above actually suppresses scrolling.
    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [disabled, clearLongPress, endDrag, resolveDropIndex])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [])

  const onSeatPointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (disabled) return
      const origin = { x: e.clientX, y: e.clientY }

      // Already arranging: grab immediately, no hold required.
      if (arranging) {
        beginDrag(id, origin)
        return
      }

      // Otherwise a long press both enters arrange mode and starts the drag,
      // so the user never has to re-grab the seat they were already holding.
      pressOrigin.current = origin
      pressedId.current = id
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null
        if (pressedId.current !== id) return
        setArranging(true)
        beginDrag(id, origin)
      }, LONG_PRESS_MS)
    },
    [arranging, disabled, beginDrag],
  )

  const cancelPress = useCallback(() => {
    if (!draggingIdRef.current) clearLongPress()
  }, [clearLongPress])

  const toggleArranging = useCallback(() => {
    setArranging((on) => {
      if (on) endDrag()
      return !on
    })
  }, [endDrag])

  const stopArranging = useCallback(() => {
    endDrag()
    setArranging(false)
  }, [endDrag])

  // True once the long press has fired, so the seat's click handler can bow
  // out instead of opening the manage sheet on release.
  const suppressNextClick = draggingId !== null

  return {
    state: { arranging, draggingId, dropIndex, dragOffset } as SeatArrangeState,
    registerSeat,
    onSeatPointerDown,
    cancelPress,
    toggleArranging,
    stopArranging,
    suppressNextClick,
  }
}
