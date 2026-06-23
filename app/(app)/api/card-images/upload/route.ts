import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

const BUCKET = 'card-images'
const MAX_BYTES = 3 * 1024 * 1024

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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function looksLikeMissingBucket(msg: string) {
  return /bucket|not found|does not exist|no such bucket/i.test(msg)
}

type ServiceClient = ReturnType<typeof createSupabaseAdminClient>

/**
 * Creates `card-images` if missing (service role). Matches migration defaults so uploads work
 * without running SQL locally — you can still apply the migration for the public SELECT policy if needed.
 */
async function ensureCardImagesBucket(supabase: ServiceClient): Promise<{ ok: true } | { ok: false; detail: string }> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) return { ok: false, detail: listError.message }

  const exists = buckets?.some((b) => b.id === BUCKET || b.name === BUCKET)
  if (exists) return { ok: true }

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  })

  if (createError) {
    if (/already exists|duplicate|been created/i.test(createError.message)) return { ok: true }
    return { ok: false, detail: createError.message }
  }

  return { ok: true }
}

/** Browsers sometimes send an empty MIME type; infer from filename (and reject HEIC, etc.). */
function resolveUploadFormat(f: File): { ext: string; contentType: string } | null {
  const rawType = String(f.type || '').toLowerCase().trim()
  if (rawType && MIME_EXT[rawType]) {
    const ext = MIME_EXT[rawType]
    const contentType = EXT_MIME[ext] ?? rawType
    return { ext, contentType }
  }

  const name = String(f.name || '').toLowerCase()
  const m = /\.(\w+)$/.exec(name)
  const rawExt = m?.[1] ?? ''

  const heic = ['heic', 'heif', 'tif', 'tiff', 'bmp', 'svg']
  if (heic.includes(rawExt)) {
    return null
  }

  if (/^(jpeg|jpg|jpe)$/.test(rawExt)) return { ext: 'jpg', contentType: 'image/jpeg' }
  if (rawExt === 'png') return { ext: 'png', contentType: 'image/png' }
  if (rawExt === 'webp') return { ext: 'webp', contentType: 'image/webp' }
  if (rawExt === 'gif') return { ext: 'gif', contentType: 'image/gif' }

  return null
}

export async function POST(req: Request) {
  try {
    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 })
    }

    const userId = String(form.get('userId') ?? '').trim()
    const file = form.get('file')

    if (!isUuid(userId)) return NextResponse.json({ error: 'Invalid userId.' }, { status: 400 })
    if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
      return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
    }

    const f = file as File
    const fmt = resolveUploadFormat(f)
    if (!fmt) {
      const name = String(f.name || '').toLowerCase()
      if (/\.(heic|heif)$/.test(name)) {
        return NextResponse.json(
          {
            error:
              'HEIC/HEIF photos are not supported yet. On iPhone: Settings → Camera → Formats → “Most Compatible”, or convert to JPEG before uploading.',
          },
          { status: 400 },
        )
      }
      return NextResponse.json(
        { error: 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.' },
        { status: 400 },
      )
    }

    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 3 MB).' }, { status: 400 })
    }

    const buf = Buffer.from(await f.arrayBuffer())
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 3 MB).' }, { status: 400 })
    }

    const path = `${userId}/${crypto.randomUUID()}.${fmt.ext}`

    let supabase: ReturnType<typeof createSupabaseAdminClient>
    try {
      supabase = createSupabaseAdminClient()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Supabase is not configured.'
      return NextResponse.json(
        {
          error: `${msg} Add SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY to .env.local.`,
        },
        { status: 503 },
      )
    }

    let uploadError = (
      await supabase.storage.from(BUCKET).upload(path, buf, {
        contentType: fmt.contentType,
        upsert: false,
      })
    ).error

    if (uploadError && looksLikeMissingBucket(uploadError.message)) {
      const ensured = await ensureCardImagesBucket(supabase)
      if (!ensured.ok) {
        return NextResponse.json(
          {
            error: `Could not create storage bucket "${BUCKET}": ${ensured.detail}. In Supabase Dashboard → Storage, create bucket "${BUCKET}" (public) or run migrations in supabase/migrations/20260510153000_storage_card_images.sql.`,
          },
          { status: 500 },
        )
      }
      uploadError = (
        await supabase.storage.from(BUCKET).upload(path, buf, {
          contentType: fmt.contentType,
          upsert: false,
        })
      ).error
    }

    if (uploadError) {
      const hint = looksLikeMissingBucket(uploadError.message)
        ? ' Set up the `card-images` bucket in Supabase Dashboard → Storage, or run supabase/migrations/20260510153000_storage_card_images.sql.'
        : ''
      return NextResponse.json(
        { error: `${uploadError.message || 'Upload failed.'}${hint}` },
        { status: 500 },
      )
    }

    const relativeUrl = `/api/card-images/serve?path=${encodeURIComponent(path)}`

    return NextResponse.json({ url: relativeUrl, path })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
