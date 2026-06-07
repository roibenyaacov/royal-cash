type ChevronForwardProps = {
  className?: string
}

/** RTL-forward chevron (points left in Hebrew layouts). */
export function ChevronForward({ className = '' }: ChevronForwardProps) {
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
