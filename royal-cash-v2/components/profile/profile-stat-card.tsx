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
    <div className="rounded-[var(--radius-card)] bg-surface-elevated border border-border p-5 flex flex-col items-center gap-3 min-h-[160px] justify-center">
      <div className="opacity-80">{icon}</div>
      <p className="text-sm text-text-secondary text-center">{label}</p>
      <p
        className={`font-bold text-3xl text-center ${valueClassName}`}
        dir="ltr"
      >
        {value}
      </p>
    </div>
  )
}
