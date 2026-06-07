import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 bg-bg">
      <div className="flex flex-col items-center gap-4 max-w-sm w-full">
        <h1 className="text-4xl font-bold text-accent">404</h1>
        <p className="text-text-secondary text-center">
          העמוד לא נמצא
        </p>
        <Link href="/groups">
          <Button>חזור לחבורות</Button>
        </Link>
      </div>
    </div>
  )
}
