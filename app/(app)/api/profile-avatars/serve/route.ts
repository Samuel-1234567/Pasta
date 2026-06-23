import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

const BUCKET = 'profile-avatars'

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

const PROFILE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const AVATAR_FILE_RE = /^avatar\.(jpe?g|png|webp|gif)$/i

/** Storage object key: `{profileUuid}/avatar.{ext}` */
function normalizeAndValidatePath(raw: string): string | null {
  try {
    const decoded = decodeURIComponent(raw).trim()
    if (!decoded || decoded.includes('..') || decoded.startsWith('/') || decoded.includes('\\')) return null

    const parts = decoded.split('/')
    if (parts.length !== 2) return null

    const [profileId, fileName] = parts
    if (!PROFILE_ID_RE.test(profileId) || !AVATAR_FILE_RE.test(fileName)) return null

    return `${profileId}/${fileName}`
  } catch {
    return null
  }
}

function contentTypeFromPath(path: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(path)
  const ext = (m?.[1] ?? 'jpg').toLowerCase().replace(/^jpeg$/i, 'jpg')
  return MIME[ext] ?? 'application/octet-stream'
}

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.get('path')
  const path = normalizeAndValidatePath(qs ?? '')
  if (!path) {
    return NextResponse.json({ error: 'Invalid path.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const buf = Buffer.from(await data.arrayBuffer())
  return new NextResponse(buf, {
    headers: {
      'Content-Type': contentTypeFromPath(path),
      'Cache-Control': 'private, no-cache, must-revalidate',
    },
  })
}
