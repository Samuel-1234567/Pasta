import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function nowIso(): string {
  return new Date().toISOString()
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: deckId } = await ctx.params
  const userId = new URL(req.url).searchParams.get('userId')?.trim() ?? ''

  if (!isUuid(deckId)) {
    return NextResponse.json({ error: 'Invalid deck id.' }, { status: 400 })
  }
  if (!isUuid(userId)) {
    return NextResponse.json({ error: 'Missing or invalid userId.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, name, profile_id, is_public')
    .eq('id', deckId)
    .maybeSingle()

  if (deckError) {
    return NextResponse.json({ error: deckError.message }, { status: 500 })
  }
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found.' }, { status: 404 })
  }

  const profileId = String((deck as { profile_id?: string }).profile_id ?? '')
  const isPublic = Boolean((deck as { is_public?: boolean }).is_public)
  const owns = profileId === userId
  if (!owns && !isPublic) {
    return NextResponse.json({ error: 'You do not have access to this deck.' }, { status: 403 })
  }

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id, front, back, position')
    .eq('deck_id', deckId)
    .order('position', { ascending: true })

  if (cardsError) {
    return NextResponse.json({ error: cardsError.message }, { status: 500 })
  }

  const cleaned = (cards ?? []).map((c) => ({
    id: String(c.id),
    front: String((c as { front?: string }).front ?? ''),
    back: String((c as { back?: string }).back ?? ''),
    position: Number((c as { position?: number }).position ?? 0),
  }))

  return NextResponse.json({
    deck: {
      id: deckId,
      name: String((deck as { name?: string }).name ?? 'Untitled'),
    },
    cards: cleaned,
    canEdit: owns,
  })
}

type PatchBody = {
  userId?: string
  name?: string
  isPublic?: boolean
  cards?: Array<{ front?: string; back?: string }>
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: deckId } = await ctx.params
  const body = (await req.json().catch(() => null)) as PatchBody | null

  const userId = String(body?.userId ?? '').trim()
  const name = String(body?.name ?? '').trim()
  const cardsRaw = body?.cards

  if (!isUuid(deckId)) {
    return NextResponse.json({ error: 'Invalid deck id.' }, { status: 400 })
  }
  if (!isUuid(userId)) {
    return NextResponse.json({ error: 'Missing or invalid userId.' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'Deck name is required.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, profile_id')
    .eq('id', deckId)
    .maybeSingle()

  if (deckError) {
    return NextResponse.json({ error: deckError.message }, { status: 500 })
  }
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found.' }, { status: 404 })
  }

  const profileId = String((deck as { profile_id?: string }).profile_id ?? '')
  if (profileId !== userId) {
    return NextResponse.json({ error: 'Only the deck owner can edit.' }, { status: 403 })
  }

  if (!Array.isArray(cardsRaw)) {
    const isPublic = Boolean(body?.isPublic)
    const lastEditedAt = nowIso()
    const { error: updateDeckError } = await supabase
      .from('decks')
      .update({ name, is_public: isPublic, last_edited_at: lastEditedAt })
      .eq('id', deckId)

    if (updateDeckError) {
      return NextResponse.json({ error: updateDeckError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      deck: { id: deckId, name, is_public: isPublic, last_edited_at: lastEditedAt },
    })
  }

  const cleanedCards = cardsRaw
    .map((c) => ({
      front: String(c?.front ?? '').trim(),
      back: String(c?.back ?? '').trim(),
    }))
    .filter((c) => c.front.length > 0 && c.back.length > 0)
    .slice(0, 200)

  if (cleanedCards.length === 0) {
    return NextResponse.json({ error: 'Add at least one card with front and back.' }, { status: 400 })
  }

  const lastEditedAt = nowIso()
  const { error: updateDeckError } = await supabase
    .from('decks')
    .update({ name, last_edited_at: lastEditedAt })
    .eq('id', deckId)
  if (updateDeckError) {
    return NextResponse.json({ error: updateDeckError.message }, { status: 500 })
  }

  const { error: deleteError } = await supabase.from('cards').delete().eq('deck_id', deckId)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const cardRows = cleanedCards.map((c, idx) => ({
    deck_id: deckId,
    front: c.front,
    back: c.back,
    position: idx,
  }))

  const { error: insertError } = await supabase.from('cards').insert(cardRows)
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, last_edited_at: lastEditedAt })
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: deckId } = await ctx.params
  const userId = new URL(req.url).searchParams.get('userId')?.trim() ?? ''

  if (!isUuid(deckId)) {
    return NextResponse.json({ error: 'Invalid deck id.' }, { status: 400 })
  }
  if (!isUuid(userId)) {
    return NextResponse.json({ error: 'Missing or invalid userId.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, profile_id')
    .eq('id', deckId)
    .maybeSingle()

  if (deckError) {
    return NextResponse.json({ error: deckError.message }, { status: 500 })
  }
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found.' }, { status: 404 })
  }

  const profileId = String((deck as { profile_id?: string }).profile_id ?? '')
  if (profileId !== userId) {
    return NextResponse.json({ error: 'Only the deck owner can delete.' }, { status: 403 })
  }

  const { error: deleteCardsError } = await supabase.from('cards').delete().eq('deck_id', deckId)
  if (deleteCardsError) {
    return NextResponse.json({ error: deleteCardsError.message }, { status: 500 })
  }

  const { error: deleteDeckError } = await supabase.from('decks').delete().eq('id', deckId)
  if (deleteDeckError) {
    return NextResponse.json({ error: deleteDeckError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
