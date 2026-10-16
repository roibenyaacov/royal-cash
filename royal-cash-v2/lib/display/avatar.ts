/**
 * Picking a seat character.
 *
 * Each player gets one of a fixed set of poker characters, chosen from their
 * id. Deterministic on purpose: the same player shows the same face on every
 * device, every reload, and for every person looking at the table. A random
 * pick would reshuffle the table on each render and make the seats harder to
 * read, not easier.
 */

/** FNV-1a, 32-bit. Small, stable, and no dependency. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Index into a character set of `count` entries. Always in range, including
 * for an empty seed.
 */
export function pickAvatarIndex(seed: string, count: number): number {
  if (count <= 0) return 0
  return hashString(seed) % count
}
