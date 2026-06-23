const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export const IMAGE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024

/** Browsers sometimes send an empty MIME type; infer from filename (and reject HEIC, etc.). */
export function resolveUploadFormat(f: File): { ext: string; contentType: string } | null {
  const rawType = String(f.type || '').toLowerCase().trim()
  if (rawType && MIME_EXT[rawType]) {
    const ext = MIME_EXT[rawType]
    const contentType = EXT_MIME[ext] ?? rawType
    return { ext, contentType }
  }

  const name = String(f.name || '').toLowerCase()
  const m = /\.(\w+)$/.exec(name)
  const rawExt = m?.[1] ?? ''

  const unsupported = ['heic', 'heif', 'tif', 'tiff', 'bmp', 'svg']
  if (unsupported.includes(rawExt)) {
    return null
  }

  if (/^(jpeg|jpg|jpe)$/.test(rawExt)) return { ext: 'jpg', contentType: 'image/jpeg' }
  if (rawExt === 'png') return { ext: 'png', contentType: 'image/png' }
  if (rawExt === 'webp') return { ext: 'webp', contentType: 'image/webp' }
  if (rawExt === 'gif') return { ext: 'gif', contentType: 'image/gif' }

  return null
}

export function heicUploadErrorMessage(): string {
  return 'HEIC/HEIF photos are not supported yet. On iPhone: Settings → Camera → Formats → “Most Compatible”, or convert to JPEG before uploading.'
}

export function unsupportedImageTypeMessage(): string {
  return 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.'
}
