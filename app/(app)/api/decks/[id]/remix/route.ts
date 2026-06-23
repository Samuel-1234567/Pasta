import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { requireUser } from '@/app/lib/supabase/require-user'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function remixDeckName(sourceName: string) {
  const trimmed = sourceName.trim() || 'Untitled'
  return trimmed.endsWith('(remix)') ? trimmed : `${trimmed} (remix)`
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { id: sourceDeckId } = await ctx.params
  if (!isUuid(sourceDeckId)) {
    return NextResponse.json({ error: 'Invalid deck id.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  const { data: sourceDeck, error: deckError } = await supabase
    .from('decks')
    .select('id, name, profile_id, is_public')
    .eq('id', sourceDeckId)
    .maybeSingle()

  if (deckError) {
    return NextResponse.json({ error: deckError.message }, { status: 500 })
  }
  if (!sourceDeck) {
    return NextResponse.json({ error: 'Deck not found.' }, { status: 404 })
  }

  const ownerId = String((sourceDeck as { profile_id?: string }).profile_id ?? '')
  const isPublic = Boolean((sourceDeck as { is_public?: boolean }).is_public)

  if (ownerId === auth.user.id) {
    return NextResponse.json({ error: 'You already own this deck.' }, { status: 400 })
  }
  if (!isPublic) {
    return NextResponse.json({ error: 'Only public decks can be remixed.' }, { status: 403 })
  }

  const { data: sourceCards, error: cardsError } = await supabase
    .from('cards')
    .select('front, back, position')
    .eq('deck_id', sourceDeckId)
    .order('position', { ascending: true })

  if (cardsError) {
    return NextResponse.json({ error: cardsError.message }, { status: 500 })
  }

  const cleanedCards = (sourceCards ?? [])
    .map((card) => ({
      front: String((card as { front?: string }).front ?? '').trim(),
      back: String((card as { back?: string }).back ?? '').trim(),
      position: Number((card as { position?: number }).position ?? 0),
    }))
    .filter((card) => card.front.length > 0 && card.back.length > 0)
    .sort((a, b) => a.position - b.position)

  if (cleanedCards.length === 0) {
    return NextResponse.json({ error: 'This deck has no cards to remix.' }, { status: 400 })
  }

  const sourceName = String((sourceDeck as { name?: string }).name ?? 'Untitled')
  const name = remixDeckName(sourceName)

  const { data: insertedDeck, error: insertDeckError } = await supabase
    .from('decks')
    .insert({
      profile_id: auth.user.id,
      name,
      is_public: false,
      remixed_from_deck_id: sourceDeckId,
    })
    .select('id')
    .single()

  if (insertDeckError || !insertedDeck?.id) {
    return NextResponse.json({ error: insertDeckError?.message ?? 'Failed to create deck.' }, { status: 500 })
  }

  const newDeckId = insertedDeck.id as string

  const cardRows = cleanedCards.map((card, idx) => ({
    deck_id: newDeckId,
    front: card.front,
    back: card.back,
    position: idx,
  }))

  const { error: insertCardsError } = await supabase.from('cards').insert(cardRows)
  if (insertCardsError) {
    await supabase.from('decks').delete().eq('id', newDeckId)
    return NextResponse.json({ error: insertCardsError.message }, { status: 500 })
  }

  return NextResponse.json({ deckId: newDeckId, name })
}
