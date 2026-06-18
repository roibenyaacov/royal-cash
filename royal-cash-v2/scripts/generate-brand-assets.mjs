import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'fs'

function pngBufferToIco(pngBuffer, size = 32) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry[0] = size >= 256 ? 0 : size
  entry[1] = size >= 256 ? 0 : size
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngBuffer.length, 8)
  entry.writeUInt32LE(22, 12)

  return Buffer.concat([header, entry, pngBuffer])
}
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const appDir = join(root, 'app')
const logoPath = join(root, 'public', 'logo.png')

const BG = '#0f0f0f'
const ACCENT = '#c9a84c'
const MUTED = '#a0a0a0'

mkdirSync(appDir, { recursive: true })

async function writeIcon() {
  await sharp(logoPath)
    .resize(512, 512, { fit: 'contain', background: BG })
    .png()
    .toFile(join(appDir, 'icon.png'))

  await sharp(logoPath)
    .resize(180, 180, { fit: 'contain', background: BG })
    .png()
    .toFile(join(appDir, 'apple-icon.png'))

  const favicon32 = await sharp(logoPath)
    .resize(32, 32, { fit: 'contain', background: { r: 15, g: 15, b: 15, alpha: 1 } })
    .ensureAlpha()
    .png({ palette: false })
    .toBuffer()

  writeFileSync(join(appDir, 'favicon.ico'), pngBufferToIco(favicon32))
}

async function writeSocialCard(filename) {
  const width = 1200
  const height = 630
  const logoMaxWidth = 720

  const logo = await sharp(logoPath)
    .resize(logoMaxWidth, Math.round(logoMaxWidth * 0.55), { fit: 'inside' })
    .png()
    .toBuffer()

  const logoMeta = await sharp(logo).metadata()
  const logoW = logoMeta.width ?? logoMaxWidth
  const logoH = logoMeta.height ?? 396
  const logoX = Math.round((width - logoW) / 2)
  const logoY = Math.round((height - logoH) / 2 - 36)

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${BG}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="${BG}"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <rect x="96" y="56" width="1008" height="2" fill="${ACCENT}" opacity="0.5"/>
  <rect x="96" y="${height - 56}" width="1008" height="2" fill="${ACCENT}" opacity="0.3"/>
  <text x="600" y="${logoY + logoH + 88}" text-anchor="middle"
    font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="42"
    fill="${MUTED}" direction="rtl">סוגרים את הערב בלי כאב ראש</text>
</svg>`

  const background = await sharp(Buffer.from(svg)).png().toBuffer()

  await sharp(background)
    .composite([{ input: logo, left: logoX, top: logoY }])
    .png()
    .toFile(join(appDir, filename))
}

await writeIcon()
await writeSocialCard('opengraph-image.png')
await writeSocialCard('twitter-image.png')

console.log('Brand assets written to app/')
