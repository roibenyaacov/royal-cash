type NavIconProps = {
  className?: string
}

export function GroupsNavIcon({ className = 'w-6 h-6' }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16 20v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1" />
      <circle cx="10" cy="8" r="3" />
      <path d="M21 20v-1a3 3 0 0 0-2.5-2.96" />
      <path d="M16 4.04a3 3 0 0 1 0 5.92" />
    </svg>
  )
}

export function OddsNavIcon({ className = 'w-6 h-6' }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6" />
      <path d="M9 11h2" />
      <path d="M13 11h2" />
      <path d="M9 15h2" />
      <path d="M13 15h2" />
    </svg>
  )
}

export function PreflopNavIcon({ className = 'w-6 h-6' }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16" />
      <path d="M4 16h16" />
      <path d="M10 4v16" />
      <path d="M16 4v16" />
    </svg>
  )
}

export function ProfileNavIcon({ className = 'w-6 h-6' }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </svg>
  )
}
