type ChevronProps = {
  className?: string
}

/** RTL-forward chevron (points left — drill into row). */
export function ChevronForward({ className = '' }: ChevronProps) {
  return (
    <svg
      viewBox="0 0 8 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-[7px] h-[11px] shrink-0 opacity-35 ${className}`}
      aria-hidden
    >
      <path
        d="M7 1L1 6.5L7 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** RTL-back chevron (points right — navigation back). */
export function ChevronBack({ className = '' }: ChevronProps) {
  return (
    <svg
      viewBox="0 0 8 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-[9px] h-[14px] shrink-0 -mr-0.5 ${className}`}
      aria-hidden
    >
      <path
        d="M1 1L7 6.5L1 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
