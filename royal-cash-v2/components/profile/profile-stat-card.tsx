type ProfileStatCardProps = {
  icon: React.ReactNode
  label: string
  value: string
  valueClassName?: string
}

export function ProfileStatCard({
  icon,
  label,
  value,
  valueClassName = 'text-text-primary',
}: ProfileStatCardProps) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface-elevated border border-border p-3 flex flex-col items-center gap-1.5 min-h-[108px] justify-center">
      <div className="opacity-80 scale-90">{icon}</div>
      <p className="text-xs text-text-secondary text-center leading-tight">{label}</p>
      <p
        className={`font-bold text-2xl text-center leading-tight ${valueClassName}`}
        dir="ltr"
      >
        {value}
      </p>
    </div>
  )
}
