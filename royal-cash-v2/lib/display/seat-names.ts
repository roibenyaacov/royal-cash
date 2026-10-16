/**
 * Short, unambiguous labels for the poker table seats.
 *
 * A seat is ~96px wide. A full name like "Roi Ben Yaacov" either truncates
 * to "...acov" (which is what players were seeing) or wraps to three lines
 * and makes the seats different heights. First names are both shorter and
 * what people actually call each other at the table.
 *
 * Collisions are real in a friend group — two Dannys is normal — so a
 * repeated first name grows by just enough to separate them:
 *   "דני כהן" + "דני לוי"  ->  "דני כ." + "דני ל."
 * If that still collides, the full name is used; at that point there is
 * nothing left to disambiguate with.
 */

function tokens(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean)
}

/** Case-insensitive key so "Dani"/"dani" are treated as the same name. */
function key(label: string): string {
  return label.toLocaleLowerCase()
}

function countByKey(labels: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const label of labels) {
    const k = key(label)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

export type SeatNameInput = {
  id: string
  name: string
}

/**
 * Maps seat id -> the label to render. Always returns an entry for every
 * input id, so callers can index without a fallback.
 */
export function resolveSeatNames(seats: SeatNameInput[]): Map<string, string> {
  const result = new Map<string, string>()

  // Pass 1 — first name only.
  const firstNames = seats.map((seat) => {
    const parts = tokens(seat.name)
    return parts[0] ?? ''
  })
  const firstCounts = countByKey(firstNames)

  // Pass 2 — for duplicates, add the next token's initial.
  const withInitial = seats.map((seat, i) => {
    const first = firstNames[i]
    if (!first) return ''
    if ((firstCounts.get(key(first)) ?? 0) < 2) return first

    const parts = tokens(seat.name)
    const next = parts[1]
    if (!next) return first
    return `${first} ${next.charAt(0)}.`
  })
  const withInitialCounts = countByKey(withInitial)

  // Pass 3 — anything still ambiguous falls back to the full name.
  seats.forEach((seat, i) => {
    const full = seat.name.trim()
    const first = firstNames[i]
    const candidate = withInitial[i]

    if (!first) {
      result.set(seat.id, full || '?')
      return
    }

    const firstIsUnique = (firstCounts.get(key(first)) ?? 0) < 2
    if (firstIsUnique) {
      result.set(seat.id, first)
      return
    }

    const candidateIsUnique = (withInitialCounts.get(key(candidate)) ?? 0) < 2
    result.set(seat.id, candidateIsUnique ? candidate : full || '?')
  })

  return result
}
