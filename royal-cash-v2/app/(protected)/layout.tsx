import { BottomNav } from '@/components/layout/bottom-nav'
import { ActiveGameFab } from '@/components/layout/active-game-fab'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-dvh pb-[68px]">
      {children}
      <ActiveGameFab />
      <BottomNav />
    </div>
  )
}
