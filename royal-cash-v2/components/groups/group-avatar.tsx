type GroupAvatarProps = {
  name: string
}

export function GroupAvatar({ name }: GroupAvatarProps) {
  const initial = name.trim().charAt(0) || '?'

  return (
    <div
      className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center
        bg-gradient-to-br from-accent/25 to-accent/10 border border-accent/25"
    >
      <span className="text-accent font-semibold text-[17px] leading-none">
        {initial}
      </span>
    </div>
  )
}
