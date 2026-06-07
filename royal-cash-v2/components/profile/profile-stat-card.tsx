type ProfileStatCardProps = {
  icon: string
  label: string
  value: string
  valueClassName?: string
  large?: boolean
}

export function ProfileStatCard({
  icon,
  label,
  value,
  valueClassName = 'text-text-primary',
  large = false,
}: ProfileStatCardProps) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface-elevated border border-border p-4 flex flex-col min-h-[120px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p
          className={`font-bold font-mono text-center ${
            large ? 'text-3xl' : 'text-2xl'
          } ${valueClassName}`}
          dir="ltr"
        >
          {value}
        </p>
      </div>
    </div>
  )
}
