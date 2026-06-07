'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { t } from '@/lib/i18n/dictionary'
import { Button } from './button'
import { BottomSheet } from './bottom-sheet'

type InviteLinkProps = {
  url: string
  title?: string
  message?: string // pre-composed WhatsApp message prefix
}

export function InviteLink({ url, title, message }: InviteLinkProps) {
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ url }).catch(() => {})
    } else {
      handleCopy()
    }
  }

  const waText = message ? `${message}\n${url}` : url
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" fullWidth onClick={handleShare}>
            {copied ? t.invites.linkCopied : t.invites.copyLink}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowQR(true)}>
            QR
          </Button>
        </div>
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="secondary" size="sm" fullWidth>
            {t.invites.sendWhatsApp} 💬
          </Button>
        </a>
      </div>

      <BottomSheet
        open={showQR}
        onClose={() => setShowQR(false)}
        title={title ?? t.invites.showQR}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-[var(--radius-card)]">
            <QRCodeSVG value={url} size={220} />
          </div>
          <p className="text-xs text-text-muted text-center break-all max-w-[260px]" dir="ltr">
            {url}
          </p>
          <Button variant="secondary" fullWidth onClick={handleCopy}>
            {copied ? t.invites.linkCopied : t.invites.copyLink}
          </Button>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="w-full">
            <Button variant="secondary" fullWidth>
              {t.invites.sendWhatsApp} 💬
            </Button>
          </a>
        </div>
      </BottomSheet>
    </>
  )
}
