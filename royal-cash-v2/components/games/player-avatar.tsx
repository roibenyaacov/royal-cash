import { pickAvatarIndex } from '@/lib/display/avatar'

// ---------------------------------------------------------------------------
// PlayerAvatar — an uploaded photo if there is one, otherwise a sheep.
//
// These render at 36px on the felt, which rules out detail: at that size only
// the silhouette reads. Every sheep is therefore built the same way — the same
// wool cluster, ears and muzzle — and the identity is carried entirely by the
// wool colour and one strong accessory shape. Viewed larger (the manage sheet)
// the finer strokes fill in.
//
// Which sheep is derived from the player id, so it is stable across reloads,
// devices and viewers. See lib/display/avatar.ts.
// ---------------------------------------------------------------------------

type Sheep = {
  /** Debug/readability only — never shown to the user. */
  name: string
  bg: [string, string]
  /** The fluff. */
  wool: string
  /** Shading on the underside of the fluff, and the ears. */
  woolShade: string
  /** Muzzle and legs. */
  face: string
  /** Drawn over the sheep, inside a 40x40 viewBox. */
  art?: React.ReactNode
}

/** Shared wool cluster — a ring of overlapping blobs, drawn behind the face. */
function Wool({ fill, shade }: { fill: string; shade: string }) {
  return (
    <>
      {/* underside first, so the top blobs catch the light */}
      <circle cx="20" cy="27" r="9" fill={shade} />
      <circle cx="12.5" cy="22" r="6.2" fill={shade} />
      <circle cx="27.5" cy="22" r="6.2" fill={shade} />
      <circle cx="20" cy="14.5" r="7.4" fill={fill} />
      <circle cx="13" cy="18.5" r="6" fill={fill} />
      <circle cx="27" cy="18.5" r="6" fill={fill} />
      <circle cx="16" cy="12.5" r="5" fill={fill} />
      <circle cx="24" cy="12.5" r="5" fill={fill} />
    </>
  )
}

/** Ears, muzzle and eyes. The muzzle is what makes it read as a sheep. */
function Face({ face, shade }: { face: string; shade: string }) {
  return (
    <>
      {/* ears, tucked under the wool and angled down */}
      <ellipse cx="9.5" cy="21.5" rx="3.6" ry="2.2" fill={shade} transform="rotate(-18 9.5 21.5)" />
      <ellipse cx="30.5" cy="21.5" rx="3.6" ry="2.2" fill={shade} transform="rotate(18 30.5 21.5)" />
      {/* muzzle */}
      <ellipse cx="20" cy="24.5" rx="6.6" ry="6.2" fill={face} />
      {/* eyes */}
      <circle cx="17.3" cy="22.8" r="1.25" fill="#15110d" />
      <circle cx="22.7" cy="22.8" r="1.25" fill="#15110d" />
      <circle cx="17.7" cy="22.4" r="0.4" fill="#ffffff" opacity="0.85" />
      <circle cx="23.1" cy="22.4" r="0.4" fill="#ffffff" opacity="0.85" />
      {/* nose + mouth */}
      <path d="M18.8 26.4h2.4l-1.2 1.3z" fill="#2b2118" opacity="0.75" />
      <path d="M20 27.8c-0.9 1-2.3 0.9-3 0.1M20 27.8c0.9 1 2.3 0.9 3 0.1"
        stroke="#2b2118" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.6" />
    </>
  )
}

const WOOL = {
  cream: '#f4ece0',
  creamShade: '#d9cdbc',
  white: '#ffffff',
  whiteShade: '#dcdcdc',
  grey: '#b9bec7',
  greyShade: '#949aa4',
  black: '#4a4a52',
  blackShade: '#34343b',
  caramel: '#e0bd92',
  caramelShade: '#c09b6d',
  pink: '#f3d3d8',
  pinkShade: '#d9aeb6',
} as const

const FACE = {
  dark: '#3a3028',
  darker: '#2b2320',
  tan: '#8d6a4d',
  pinkish: '#9b7367',
} as const

const SHEEP: Sheep[] = [
  {
    name: 'shades',
    bg: ['#3b2a56', '#211734'],
    wool: WOOL.cream,
    woolShade: WOOL.creamShade,
    face: FACE.dark,
    art: (
      <>
        <rect x="13" y="21" width="6.2" height="4.4" rx="1.8" fill="#15110d" />
        <rect x="20.8" y="21" width="6.2" height="4.4" rx="1.8" fill="#15110d" />
        <path d="M19.2 22.6h1.6" stroke="#15110d" strokeWidth="1.2" />
        <path d="M13 22.3l-2.6-0.8M27 22.3l2.6-0.8" stroke="#15110d" strokeWidth="1" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: 'cowboy',
    bg: ['#5a3a22', '#30200f'],
    wool: WOOL.caramel,
    woolShade: WOOL.caramelShade,
    face: FACE.tan,
    art: (
      <>
        <path d="M5.5 13.5c4.5 2.2 24.5 2.2 29 0-3-1-5-1.4-7-1.6-0.6-4-2.6-5.9-7.5-5.9s-6.9 1.9-7.5 5.9c-2 0.2-4 0.6-7 1.6z" fill="#7b4a26" />
        <path d="M13 11.9c3.6 1 10.4 1 14 0" stroke="#4e2d16" strokeWidth="1.5" fill="none" />
      </>
    ),
  },
  {
    name: 'crown',
    bg: ['#4a3b10', '#241c06'],
    wool: WOOL.white,
    woolShade: WOOL.whiteShade,
    face: FACE.dark,
    art: (
      <>
        <path d="M12 11.5l1.4-6 3.3 3.4L20 4l3.3 4.9 3.3-3.4 1.4 6z" fill="#e8c96a" />
        <path d="M12 11.5h16v2.2H12z" fill="#c9a84c" />
        <circle cx="20" cy="7.6" r="1" fill="#fff6d8" />
      </>
    ),
  },
  {
    name: 'cap',
    bg: ['#123a4a', '#07212c'],
    wool: WOOL.grey,
    woolShade: WOOL.greyShade,
    face: FACE.dark,
    art: (
      <>
        <path d="M10.5 12.8c0-5.2 4.2-8.3 9.5-8.3s9.5 3.1 9.5 8.3z" fill="#19a0c7" />
        <path d="M29.5 12.8c3.6 0.2 5.6 1 6.4 2.3-2.4 0.7-5.4 0.9-6.4 0.6z" fill="#1588a8" />
        <circle cx="20" cy="5.2" r="1.1" fill="#0d6c86" />
      </>
    ),
  },
  {
    name: 'headphones',
    bg: ['#2b2140', '#171024'],
    wool: WOOL.cream,
    woolShade: WOOL.creamShade,
    face: FACE.dark,
    art: (
      <>
        <path d="M8.5 20c0-7 5.2-11.5 11.5-11.5S31.5 13 31.5 20" stroke="#2f2f38" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <rect x="5.8" y="18" width="5.4" height="7.6" rx="2.5" fill="#d14b4b" />
        <rect x="28.8" y="18" width="5.4" height="7.6" rx="2.5" fill="#d14b4b" />
      </>
    ),
  },
  {
    name: 'cigar',
    bg: ['#3d2a1c', '#1f1510'],
    wool: WOOL.caramel,
    woolShade: WOOL.caramelShade,
    face: FACE.tan,
    art: (
      <>
        {/* handlebar moustache — reads at 36px where the cigar alone would not */}
        <path d="M14.6 26.6c1.6-1.2 3.6-1.2 5.4-0.2 1.8-1 3.8-1 5.4 0.2-1.6 0.3-3.4 0.9-5.4 0.9s-3.8-0.6-5.4-0.9z" fill="#2b2118" />
        <rect x="24" y="28.2" width="9" height="2.6" rx="1.3" fill="#6b4a2c" transform="rotate(-10 24 28.2)" />
        <circle cx="33.4" cy="26.8" r="1.5" fill="#ff8c3a" />
        <circle cx="33.4" cy="26.8" r="0.7" fill="#ffd9a0" />
      </>
    ),
  },
  {
    name: 'visor',
    bg: ['#17422a', '#0a2315'],
    wool: WOOL.white,
    woolShade: WOOL.whiteShade,
    face: FACE.dark,
    art: (
      <>
        <path d="M9 17.5c0-3.4 4.9-5.6 11-5.6s11 2.2 11 5.6z" fill="#2f8a52" />
        <path d="M6.5 17.5c0 2.6 5.8 4.3 13.5 4.3s13.5-1.7 13.5-4.3z" fill="#1f6b3c" opacity="0.92" />
      </>
    ),
  },
  {
    name: 'bandana',
    bg: ['#4a1620', '#260a10'],
    wool: WOOL.black,
    woolShade: WOOL.blackShade,
    face: FACE.darker,
    art: (
      <>
        <path d="M9.5 14.5c3.4-3.4 17.6-3.4 21 0-3 1.6-18 1.6-21 0z" fill="#c23b4a" />
        <path d="M9.8 14.2l-3.4 2.4 1.2 3.2 3-3z" fill="#a62f3c" />
        <circle cx="14" cy="13.6" r="0.8" fill="#f2dede" opacity="0.8" />
        <circle cx="20" cy="12.9" r="0.8" fill="#f2dede" opacity="0.8" />
        <circle cx="26" cy="13.6" r="0.8" fill="#f2dede" opacity="0.8" />
      </>
    ),
  },
  {
    name: 'beanie',
    bg: ['#1b2f4a', '#0c1826'],
    wool: WOOL.grey,
    woolShade: WOOL.greyShade,
    face: FACE.dark,
    art: (
      <>
        <path d="M10.5 13c0-5.4 4.2-8.6 9.5-8.6s9.5 3.2 9.5 8.6z" fill="#3f6fa8" />
        <rect x="9.5" y="12.4" width="21" height="3.4" rx="1.7" fill="#2c4f78" />
        <circle cx="20" cy="3.6" r="2.1" fill="#d9e4f0" />
      </>
    ),
  },
  {
    name: 'flower',
    bg: ['#4a2340', '#260f1f'],
    wool: WOOL.pink,
    woolShade: WOOL.pinkShade,
    face: FACE.pinkish,
    art: (
      <>
        <g transform="translate(28.5 11.5)">
          <circle cx="0" cy="-3.2" r="2.4" fill="#f5a3c0" />
          <circle cx="3.1" cy="-1" r="2.4" fill="#f5a3c0" />
          <circle cx="1.9" cy="2.6" r="2.4" fill="#f5a3c0" />
          <circle cx="-1.9" cy="2.6" r="2.4" fill="#f5a3c0" />
          <circle cx="-3.1" cy="-1" r="2.4" fill="#f5a3c0" />
          <circle cx="0" cy="0" r="1.9" fill="#ffd96b" />
        </g>
      </>
    ),
  },
]

type PlayerAvatarProps = {
  /** Seed for picking the sheep. Stable per player. */
  playerId: string
  size?: number
  /** Dimmed + desaturated, for a player who has cashed out. */
  muted?: boolean
  /** An uploaded photo. Replaces the sheep entirely when present. */
  imageUrl?: string | null
  /** Used only as alt text for a photo. */
  name?: string
}

export function PlayerAvatar({
  playerId,
  size = 40,
  muted = false,
  imageUrl,
  name,
}: PlayerAvatarProps) {
  const mutedStyle = muted
    ? { opacity: 0.55, filter: 'grayscale(1)' as const }
    : undefined

  if (imageUrl) {
    return (
      // A plain <img>: next/image would need every Supabase project host
      // registered in next.config, and buys nothing for a 256px avatar that
      // is already resized before upload.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name ?? ''}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, ...mutedStyle }}
      />
    )
  }

  const sheep = SHEEP[pickAvatarIndex(playerId, SHEEP.length)]
  const gradientId = `sheep-${pickAvatarIndex(playerId, SHEEP.length)}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className="shrink-0"
      role="presentation"
      aria-hidden="true"
      style={mutedStyle}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sheep.bg[0]} />
          <stop offset="100%" stopColor={sheep.bg[1]} />
        </linearGradient>
        <clipPath id={`${gradientId}-clip`}>
          <circle cx="20" cy="20" r="20" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${gradientId}-clip)`}>
        <circle cx="20" cy="20" r="20" fill={`url(#${gradientId})`} />
        <Wool fill={sheep.wool} shade={sheep.woolShade} />
        <Face face={sheep.face} shade={sheep.woolShade} />
        {sheep.art}
      </g>
    </svg>
  )
}
