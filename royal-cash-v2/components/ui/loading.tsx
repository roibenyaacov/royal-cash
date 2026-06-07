export function Loading({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      {message && <p className="text-sm text-text-muted">{message}</p>}
    </div>
  )
}
