'use client'

import { useRef, useState, useCallback } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { PlayerAvatar } from '@/components/games/player-avatar'
import { createClient } from '@/lib/supabase/client'
import { setMyAvatarAction } from '@/app/actions/profile'

/** Stored edge. A seat renders at 36px, a list row at 44 — 256 covers 3x. */
const TARGET_PX = 256
const JPEG_QUALITY = 0.85
/** Matches the bucket's own ceiling, so a reject happens before the upload. */
const MAX_SOURCE_BYTES = 12 * 1024 * 1024

type AvatarUploaderProps = {
  userId: string
  /** Seeds the fallback sheep, so it matches the one shown at the table. */
  seedId: string
  name: string
  imageUrl: string | null
  onChange: (url: string | null) => void
}

/**
 * Shrinks a photo straight off the phone to a square avatar.
 *
 * A picture from an iPhone is several thousand pixels wide and a few
 * megabytes; sending that as-is would mean a slow upload on cellular and
 * every member of the group downloading it to draw a 36px seat. Cropping
 * to the centre square first is what keeps a portrait from arriving
 * squashed, since the seat draws it round.
 */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const edge = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - edge) / 2
    const sy = (bitmap.height - edge) / 2

    const canvas = document.createElement('canvas')
    canvas.width = TARGET_PX
    canvas.height = TARGET_PX
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no_canvas_context')
    ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, TARGET_PX, TARGET_PX)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) throw new Error('encode_failed')
    return blob
  } finally {
    bitmap.close()
  }
}

export function AvatarUploader({
  userId,
  seedId,
  name,
  imageUrl,
  onChange,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const describe = useCallback((err: unknown): string => {
    const message = err instanceof Error ? err.message : ''
    if (message === 'avatar_needs_migration') return t.profile.photoNeedsMigration
    if (message === 'invalid_avatar_url') return t.profile.photoFailed
    // A missing bucket is the same unfinished setup as a missing function.
    if (/bucket/i.test(message)) return t.profile.photoNeedsMigration
    if (/exceeded the maximum|too large|payload/i.test(message)) {
      return t.profile.photoTooLarge
    }
    return t.profile.photoFailed
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      setError('')

      if (!file.type.startsWith('image/')) {
        setError(t.profile.photoInvalidType)
        return
      }
      if (file.size > MAX_SOURCE_BYTES) {
        setError(t.profile.photoTooLarge)
        return
      }

      setBusy(true)
      try {
        let blob: Blob
        try {
          blob = await toSquareJpeg(file)
        } catch (decodeErr) {
          // A format the browser cannot decode — an untranscoded HEIC, say.
          console.error('Failed to decode the chosen image:', decodeErr)
          setError(t.profile.photoInvalidType)
          return
        }

        const supabase = createClient()
        // The folder is the uploader's own user id, which is exactly what
        // the storage policy checks; a timestamped name means a new photo
        // never has to wait for a CDN cache to drop the old one.
        const path = `${userId}/${Date.now()}.jpg`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        if (uploadError) throw new Error(uploadError.message)

        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(path)

        await setMyAvatarAction(publicUrl)
        onChange(publicUrl)

        // Best effort: the profile now points at the new file, so earlier
        // ones are dead weight. Failing to tidy up is not worth an error.
        try {
          const { data: existing } = await supabase.storage
            .from('avatars')
            .list(userId)
          const stale = (existing ?? [])
            .map((f) => `${userId}/${f.name}`)
            .filter((p) => p !== path)
          if (stale.length) {
            await supabase.storage.from('avatars').remove(stale)
          }
        } catch (cleanupErr) {
          console.error('Avatar saved but cleanup failed:', cleanupErr)
        }
      } catch (err) {
        console.error('Failed to upload avatar:', err)
        setError(describe(err))
      } finally {
        setBusy(false)
      }
    },
    [userId, onChange, describe],
  )

  const handleRemove = useCallback(async () => {
    setError('')
    setBusy(true)
    try {
      await setMyAvatarAction(null)
      onChange(null)
      try {
        const supabase = createClient()
        const { data: existing } = await supabase.storage
          .from('avatars')
          .list(userId)
        const files = (existing ?? []).map((f) => `${userId}/${f.name}`)
        if (files.length) {
          await supabase.storage.from('avatars').remove(files)
        }
      } catch (cleanupErr) {
        console.error('Avatar cleared but cleanup failed:', cleanupErr)
      }
    } catch (err) {
      console.error('Failed to clear avatar:', err)
      setError(describe(err))
    } finally {
      setBusy(false)
    }
  }, [userId, onChange, describe])

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-label={imageUrl ? t.profile.photoChange : t.profile.photoAdd}
        className="relative shrink-0 rounded-full active:opacity-70
          transition-opacity disabled:opacity-50"
      >
        <PlayerAvatar
          playerId={seedId}
          imageUrl={imageUrl}
          name={name}
          size={56}
        />
        <span
          className="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full
            bg-accent border-2 border-background flex items-center
            justify-center"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#000"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 8a2 2 0 012-2h2l1.2-2h7.6L18 6h2a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            <circle cx="12" cy="12.5" r="3.2" />
          </svg>
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">
          {t.profile.photoTitle}
        </p>
        <p className="text-xs text-text-muted mt-0.5 leading-snug">
          {t.profile.photoHint}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="text-xs text-accent min-h-[32px] active:opacity-60
              transition-opacity disabled:opacity-50"
          >
            {busy
              ? t.profile.photoUploading
              : imageUrl
                ? t.profile.photoChange
                : t.profile.photoAdd}
          </button>
          {imageUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRemove}
              className="text-xs text-text-muted min-h-[32px] active:opacity-60
                transition-opacity disabled:opacity-50"
            >
              {t.profile.photoRemove}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-negative mt-1">{error}</p>}
      </div>

      {/* `image/*` is what makes iOS offer the camera and the photo library
          side by side, and it hands back a JPEG for a library photo rather
          than the HEIC actually on disk. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Cleared so choosing the same file twice still fires a change.
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />
    </div>
  )
}
