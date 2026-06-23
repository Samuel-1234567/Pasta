import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import {
  heicUploadErrorMessage,
  IMAGE_UPLOAD_MAX_BYTES,
  resolveUploadFormat,
  unsupportedImageTypeMessage,
} from '@/app/lib/image-upload'
import { requireUser } from '@/app/lib/supabase/require-user'

const BUCKET = 'profile-avatars'

function looksLikeMissingBucket(msg: string) {
  return /bucket|not found|does not exist|no such bucket/i.test(msg)
}

async function ensureProfileAvatarsBucket(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<{ ok: true } | { ok: false; detail: string }> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) return { ok: false, detail: listError.message }

  const exists = buckets?.some((b) => b.id === BUCKET || b.name === BUCKET)
  if (exists) return { ok: true }

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: IMAGE_UPLOAD_MAX_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  })

  if (createError) {
    if (/already exists|duplicate|been created/i.test(createError.message)) return { ok: true }
    return { ok: false, detail: createError.message }
  }

  return { ok: true }
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  }

  const f = file as File
  const fmt = resolveUploadFormat(f)
  if (!fmt) {
    const name = String(f.name || '').toLowerCase()
    if (/\.(heic|heif)$/.test(name)) {
      return NextResponse.json({ error: heicUploadErrorMessage() }, { status: 400 })
    }
    return NextResponse.json({ error: unsupportedImageTypeMessage() }, { status: 400 })
  }

  if (f.size > IMAGE_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: 'Image too large (max 3 MB).' }, { status: 400 })
  }

  const buf = Buffer.from(await f.arrayBuffer())
  if (buf.byteLength > IMAGE_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: 'Image too large (max 3 MB).' }, { status: 400 })
  }

  const storagePath = `${auth.user.id}/avatar.${fmt.ext}`
  const avatarUrl = `/api/profile-avatars/serve?path=${encodeURIComponent(storagePath)}&v=${Date.now()}`

  let supabase: ReturnType<typeof createSupabaseAdminClient>
  try {
    supabase = createSupabaseAdminClient()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Supabase is not configured.'
    return NextResponse.json({ error: msg }, { status: 503 })
  }

  let uploadError = (
    await supabase.storage.from(BUCKET).upload(storagePath, buf, {
      contentType: fmt.contentType,
      upsert: true,
    })
  ).error

  if (uploadError && looksLikeMissingBucket(uploadError.message)) {
    const ensured = await ensureProfileAvatarsBucket(supabase)
    if (!ensured.ok) {
      return NextResponse.json(
        {
          error: `Could not create storage bucket "${BUCKET}": ${ensured.detail}. Run supabase/migrations/20260609140000_profiles_avatar.sql.`,
        },
        { status: 500 },
      )
    }
    uploadError = (
      await supabase.storage.from(BUCKET).upload(storagePath, buf, {
        contentType: fmt.contentType,
        upsert: true,
      })
    ).error
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message || 'Upload failed.' }, { status: 500 })
  }

  const { error: updateError } = await supabase.from('profiles').upsert(
    {
      id: auth.user.id,
      email: auth.user.email ?? null,
      avatar_url: avatarUrl,
    },
    { onConflict: 'id' },
  )

  if (updateError) {
    const missingColumn = /avatar_url|column .* does not exist/i.test(updateError.message)
    return NextResponse.json(
      {
        error: missingColumn
          ? 'Profile pictures require a database migration. Run supabase/migrations/20260609140000_profiles_avatar.sql.'
          : updateError.message,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ avatarUrl })
}
