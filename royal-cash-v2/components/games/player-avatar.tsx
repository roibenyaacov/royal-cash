import { pickAvatarIndex } from '@/lib/display/avatar'

// ---------------------------------------------------------------------------
// PlayerAvatar — a poker character per seat, instead of the player's initial.
//
// These render at 36px on the felt, which rules out detail: at that size only
// the silhouette reads. So every character is built the same way — a head, one
// strong hat-or-hair shape, and at most one accessory — and leans on the
// outline shape rather than internal lines to stay distinguishable. Viewed
// larger (the manage sheet) the extra strokes fill in.
//
// The character is derived from the player id, so it is stable across reloads,
// devices and viewers. See lib/display/avatar.ts.
// ---------------------------------------------------------------------------

const SKIN = {
  light: '#f0c9a4',
  tan: '#d9a173',
  warm: '#c08457',
  deep: '#8d5a3b',
  dark: '#6b4430',
} as const

type Character = {
  /** Debug/readability only — never shown to the user. */
  name: string
  bg: [string, string]
  skin: string
  /** Drawn over the head, inside a 40x40 viewBox. */
  art: React.ReactNode
}

const HEAD_CX = 20
const HEAD_CY = 23
const HEAD_R = 10

/** Shared neck + head, so the characters only describe what differs. */
function Head({ skin }: { skin: string }) {
  return (
    <>
      <rect x="16" y="29" width="8" height="8" rx="3" fill={skin} opacity="0.9" />
      <circle cx={HEAD_CX} cy={HEAD_CY} r={HEAD_R} fill={skin} />
    </>
  )
}

/** Two dots. Deliberately plain — the hat carries the identity. */
function Eyes({ y = 23 }: { y?: number }) {
  return (
    <>
      <circle cx="16.5" cy={y} r="1.3" fill="#2b2118" />
      <circle cx="23.5" cy={y} r="1.3" fill="#2b2118" />
    </>
  )
}

const CHARACTERS: Character[] = [
  {
    name: 'shades',
    bg: ['#3b2a56', '#211734'],
    skin: SKIN.tan,
    art: (
      <>
        <path d="M10 20c1-7 6-10 10-10s9 3 10 10c-3-4-6-5-10-5s-7 1-10 5z" fill="#241c17" />
        <rect x="11" y="20" width="7.5" height="5.5" rx="2.2" fill="#15110d" />
        <rect x="21.5" y="20" width="7.5" height="5.5" rx="2.2" fill="#15110d" />
        <path d="M18.5 22.2h3" stroke="#15110d" strokeWidth="1.4" />
        <path d="M16 30.5c2.5 1.5 6 1.5 8.5 0" stroke="#7d4b3a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: 'cowboy',
    bg: ['#6b3a1f', '#3a1f10'],
    skin: SKIN.warm,
    art: (
      <>
        <Eyes />
        <path d="M16 29c2.5 1.6 5.5 1.6 8 0" stroke="#6b3f2a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <ellipse cx="20" cy="15.5" rx="15" ry="3.4" fill="#5d3a22" />
        <path d="M13.5 15.5c0-5 2.6-8 6.5-8s6.5 3 6.5 8z" fill="#7a4d2c" />
        <path d="M13.2 14.2h13.6" stroke="#c9a84c" strokeWidth="1.6" />
      </>
    ),
  },
  {
    name: 'visor',
    bg: ['#15503f', '#0b2c23'],
    skin: SKIN.light,
    art: (
      <>
        <Eyes y={24} />
        <path d="M16 30c2.5 1.5 5.5 1.5 8 0" stroke="#b8805f" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M11 17.5h18" stroke="#2f2a24" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M9.5 17.5c0 3.4 4.7 5.2 10.5 5.2s10.5-1.8 10.5-5.2z" fill="#2fae7e" opacity="0.85" />
      </>
    ),
  },
  {
    name: 'hoodie',
    // The hood has to sit well clear of the backdrop or it reads as one dark
    // blob at seat size, so the background goes near-black and the hood light.
    bg: ['#141a24', '#080b11'],
    skin: SKIN.deep,
    art: (
      <>
        <path d="M4 36c0-12 6.5-20.5 16-20.5S36 24 36 36z" fill="#6d7d96" />
        <circle cx={HEAD_CX} cy={HEAD_CY} r={HEAD_R} fill={SKIN.deep} />
        <path d="M9 21.5c1.8-7.5 6.3-10.8 11-10.8s9.2 3.3 11 10.8c-2-3.2-5-4.6-11-4.6s-9 1.4-11 4.6z" fill="#55637a" />
        <Eyes y={24.5} />
        <path d="M16.5 30c2.2 1.3 4.8 1.3 7 0" stroke="#5a3826" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* drawstrings, so the shape reads as a hood and not a helmet */}
        <path d="M13.5 32v5M26.5 32v5" stroke="#aebacd" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: 'cigar',
    bg: ['#5c1f24', '#2e1014'],
    skin: SKIN.warm,
    art: (
      <>
        <path d="M10 19c1.5-6.5 5.5-9 10-9s8.5 2.5 10 9c-2.5-3.5-6-4.5-10-4.5S12.5 15.5 10 19z" fill="#3a2a1d" />
        <Eyes />
        {/* Handlebar moustache carries the character at seat size; the cigar
            is the detail you only catch up close. */}
        <path d="M13.5 27.5c2 0 2.8-1.2 4-1.2h5c1.2 0 2 1.2 4 1.2-1.6 1.9-3.4 2.1-4.6 1.4-1.3-.8-2.5-.8-3.8 0-1.2.7-3 .5-4.6-1.4z" fill="#2f2118" />
        <rect x="20" y="30.4" width="12" height="3.6" rx="1.8" fill="#7a5533" transform="rotate(10 20 30.4)" />
        <circle cx="32.2" cy="32.6" r="1.9" fill="#f08a2c" />
      </>
    ),
  },
  {
    name: 'cap',
    bg: ['#1d3c6e', '#0f2039'],
    skin: SKIN.tan,
    art: (
      <>
        <Eyes y={24} />
        <path d="M16 30c2.5 1.5 5.5 1.5 8 0" stroke="#8a5a3f" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M11 18.5c0-5.5 4-9 9-9s9 3.5 9 9z" fill="#2f6bc4" />
        {/* brim pointing back */}
        <path d="M11 18.5H4.5c0-2 2.5-3 6.5-3z" fill="#245296" />
        <circle cx="20" cy="10.2" r="1.3" fill="#9ec5f5" />
      </>
    ),
  },
  {
    name: 'headphones',
    bg: ['#4a2b63', '#261634'],
    skin: SKIN.light,
    art: (
      <>
        <path d="M10 21c1-7 5.5-10 10-10s9 3 10 10c-3-4-6-5.5-10-5.5S13 17 10 21z" fill="#4a3a2c" />
        <Eyes />
        <path d="M16 30c2.5 1.5 5.5 1.5 8 0" stroke="#b8805f" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M8.5 24c0-7 5-12 11.5-12s11.5 5 11.5 12" stroke="#d8d4e6" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <rect x="5.5" y="22" width="5.5" height="8.5" rx="2.6" fill="#b9b2d1" />
        <rect x="29" y="22" width="5.5" height="8.5" rx="2.6" fill="#b9b2d1" />
      </>
    ),
  },
  {
    name: 'tuxedo',
    bg: ['#14202e', '#080e16'],
    skin: SKIN.light,
    art: (
      <>
        <path d="M10.5 19.5c1-7 5.5-9.5 9.5-9.5s8.5 2.5 9.5 9.5c-2.5-4-5.5-5-9.5-5s-7 1-9.5 5z" fill="#1a1a1a" />
        <Eyes />
        <path d="M16 29.5c2.5 1.5 5.5 1.5 8 0" stroke="#b8805f" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {/* Collar and bowtie pulled up into the circle — placed any lower and
            the clip path cut the bowtie in half. */}
        <path d="M12 40c0-4.5 3.6-7.5 8-7.5s8 3 8 7.5z" fill="#f4f4f4" />
        <path d="M20 32.5l-4.5 1.6L20 40l4.5-5.9z" fill="#14202e" />
        <path d="M14.2 33.4l5 2.3-5 2.3z" fill="#c9a84c" />
        <path d="M25.8 33.4l-5 2.3 5 2.3z" fill="#c9a84c" />
        <rect x="18.8" y="34.4" width="2.4" height="2.6" rx="0.8" fill="#9c7f30" />
      </>
    ),
  },
  {
    name: 'beanie',
    bg: ['#1f4d4f', '#0e2728'],
    skin: SKIN.deep,
    art: (
      <>
        <Eyes y={24.5} />
        <path d="M16.5 30.5c2.2 1.3 4.8 1.3 7 0" stroke="#5a3826" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M11 19c0-6 4-9.5 9-9.5s9 3.5 9 9.5z" fill="#d1584f" />
        <rect x="10" y="17.5" width="20" height="4" rx="2" fill="#ebebeb" />
        <circle cx="20" cy="8.2" r="2.4" fill="#ebebeb" />
      </>
    ),
  },
  {
    name: 'beret',
    bg: ['#53391c', '#2b1c0d'],
    skin: SKIN.dark,
    art: (
      <>
        <Eyes y={24} />
        <path d="M15.5 29.5h9v2.5c0 1.8-2 3-4.5 3s-4.5-1.2-4.5-3z" fill="#3b2a1d" />
        <path d="M10.5 17.5c0-4.6 4.2-7.8 9.5-7.8 4.6 0 8 2 8 4.4 0 2.3-3 3.4-8 3.4z" fill="#a8323f" />
        <circle cx="26.8" cy="11.6" r="1.5" fill="#a8323f" />
      </>
    ),
  },
]

export const AVATAR_COUNT = CHARACTERS.length

type PlayerAvatarProps = {
  /** Seed for the character pick — stable per player. */
  playerId: string
  /** Rendered px. The art is a 40x40 viewBox and scales cleanly. */
  size?: number
  /** Dim the avatar, e.g. once a player has cashed out. */
  muted?: boolean
  className?: string
}

export function PlayerAvatar({
  playerId,
  size = 36,
  muted = false,
  className = '',
}: PlayerAvatarProps) {
  const character = CHARACTERS[pickAvatarIndex(playerId, CHARACTERS.length)]
  // Scoped to the character so two seats sharing one never collide, and
  // stable so it does not churn across renders.
  const gradientId = `seat-bg-${character.name}`

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={className}
      role="presentation"
      aria-hidden="true"
      style={muted ? { opacity: 0.55, filter: 'grayscale(1)' } : undefined}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={character.bg[0]} />
          <stop offset="100%" stopColor={character.bg[1]} />
        </linearGradient>
        <clipPath id={`${gradientId}-clip`}>
          <circle cx="20" cy="20" r="20" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${gradientId}-clip)`}>
        <circle cx="20" cy="20" r="20" fill={`url(#${gradientId})`} />
        <Head skin={character.skin} />
        {character.art}
      </g>
    </svg>
  )
}
