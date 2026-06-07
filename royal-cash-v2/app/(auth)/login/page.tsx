'use client'

import Image from 'next/image'
import { t } from '@/lib/i18n/dictionary'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/ui/google-icon'
import { useAuth } from '@/hooks/use-auth'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 bg-bg">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="Royal Cash"
            width={160}
            height={52}
            className="h-14 w-auto object-contain"
            priority
          />
          <p className="text-text-secondary text-center text-lg">
            {t.auth.tagline}
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={signInWithGoogle}
        >
          <span className="inline-flex items-center justify-center gap-2.5">
            <GoogleIcon />
            {t.auth.loginWithGoogle}
          </span>
        </Button>
      </div>
    </div>
  )
}
