import { BottomNav } from '@/components/layout/bottom-nav'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-dvh pb-[68px]">
      {children}
      <BottomNav />
    </div>
  )
}
