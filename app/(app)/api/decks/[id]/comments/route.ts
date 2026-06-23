import { NextResponse } from 'next/server'
import { authorLabelFromProfile, loadProfilesById } from '@/app/lib/community-author'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { requireUser } from '@/app/lib/supabase/require-user'

const MAX_COMMENT_LENGTH = 2000

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

async function loadPublicDeck(deckId: string) {
  const supabase = createSupabaseAdminClient()
  const { data: deck, error } = await supabase
    .from('decks')
    .select('id, profile_id, is_public')
    .eq('id', deckId)
    .maybeSingle()

  if (error) {
    return { error: error.message, status: 500 as const, deck: null }
  }
  if (!deck) {
    return { error: 'Deck not found.', status: 404 as const, deck: null }
  }

  const isPublic = Boolean((deck as { is_public?: boolean }).is_public)
  const profileId = String((deck as { profile_id?: string }).profile_id ?? '')

  return { error: null, status: 200 as const, deck: { id: deckId, isPublic, profileId } }
}

function canViewComments(deck: { isPublic: boolean; profileId: string }, userId: string) {
  return deck.isPublic || deck.profileId === userId
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { id: deckId } = await ctx.params
  if (!isUuid(deckId)) {
    return NextResponse.json({ error: 'Invalid deck id.' }, { status: 400 })
  }

  const deckResult = await loadPublicDeck(deckId)
  if (!deckResult.deck) {
    return NextResponse.json({ error: deckResult.error }, { status: deckResult.status })
  }
  if (!canViewComments(deckResult.deck, auth.user.id)) {
    return NextResponse.json({ error: 'You do not have access to this deck.' }, { status: 403 })
  }
  if (!deckResult.deck.isPublic) {
    return NextResponse.json({ comments: [] })
  }

  const supabase = createSupabaseAdminClient()
  const { data: comments, error: commentsError } = await supabase
    .from('deck_comments')
    .select('id, profile_id, body, created_at')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true })

  if (commentsError) {
    return NextResponse.json({ error: commentsError.message }, { status: 500 })
  }

  const profileIds = [...new Set((comments ?? []).map((row) => String(row.profile_id)).filter(Boolean))]

  let profileById: Awaited<ReturnType<typeof loadProfilesById>>
  try {
    profileById = await loadProfilesById(supabase, profileIds)
  } catch (profileError) {
    const message = profileError instanceof Error ? profileError.message : 'Failed to load profiles.'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const response = (comments ?? []).map((row) => {
    const profileId = String(row.profile_id)
    return {
      id: String(row.id),
      profile_id: profileId,
      author_label: authorLabelFromProfile(profileById.get(profileId) ?? {}),
      body: String(row.body),
      created_at: String(row.created_at),
      can_delete: profileId === auth.user!.id,
    }
  })

  return NextResponse.json({ comments: response })
}

type PostBody = {
  body?: string
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { id: deckId } = await ctx.params
  if (!isUuid(deckId)) {
    return NextResponse.json({ error: 'Invalid deck id.' }, { status: 400 })
  }

  let payload: PostBody
  try {
    payload = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const body = payload.body?.trim() ?? ''
  if (!body) {
    return NextResponse.json({ error: 'Comment cannot be empty.' }, { status: 400 })
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `Comment must be at most ${MAX_COMMENT_LENGTH} characters.` },
      { status: 400 },
    )
  }

  const deckResult = await loadPublicDeck(deckId)
  if (!deckResult.deck) {
    return NextResponse.json({ error: deckResult.error }, { status: deckResult.status })
  }
  if (!deckResult.deck.isPublic) {
    return NextResponse.json({ error: 'Comments are only available on public decks.' }, { status: 403 })
  }
  if (!canViewComments(deckResult.deck, auth.user.id)) {
    return NextResponse.json({ error: 'You do not have access to this deck.' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: inserted, error: insertError } = await supabase
    .from('deck_comments')
    .insert({
      deck_id: deckId,
      profile_id: auth.user.id,
      body,
    })
    .select('id, profile_id, body, created_at')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  let authorLabel = 'Community member'
  try {
    const profileById = await loadProfilesById(supabase, [auth.user.id])
    authorLabel = authorLabelFromProfile(profileById.get(auth.user.id) ?? {})
  } catch {
    // Fall back to generic label if profile lookup fails.
  }

  return NextResponse.json(
    {
      comment: {
        id: String(inserted.id),
        profile_id: auth.user.id,
        author_label: authorLabel,
        body: String(inserted.body),
        created_at: String(inserted.created_at),
        can_delete: true,
      },
    },
    { status: 201 },
  )
}
