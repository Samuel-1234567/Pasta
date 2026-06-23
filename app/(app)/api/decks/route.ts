import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId || !isUuid(userId)) {
    return NextResponse.json({ error: 'Missing or invalid userId.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  const { data: decks, error: decksError } = await supabase
    .from('decks')
    .select('*')
    .eq('profile_id', userId)
    .order('name', { ascending: true })

  if (decksError) {
    return NextResponse.json({ error: decksError.message }, { status: 500 })
  }

  const deckIds = (decks ?? []).map((d) => d.id).filter(Boolean)

  const cardCountsByDeckId = new Map<string, number>()
  if (deckIds.length > 0) {
    const { data: cards, error: cardsError } = await supabase.from('cards').select('deck_id').in('deck_id', deckIds)
    if (cardsError) {
      return NextResponse.json({ error: cardsError.message }, { status: 500 })
    }

    for (const row of cards ?? []) {
      const deckId = row.deck_id as string | null
      if (!deckId) continue
      cardCountsByDeckId.set(deckId, (cardCountsByDeckId.get(deckId) ?? 0) + 1)
    }
  }

  const response = (decks ?? []).map((deck) => ({
    id: deck.id as string,
    name: deck.name as string,
    is_public: Boolean((deck as { is_public?: boolean }).is_public),
    profile_id: deck.profile_id as string,
    remixed_from_deck_id:
      (deck as { remixed_from_deck_id?: string | null }).remixed_from_deck_id ?? null,
    created_at: (deck as { created_at?: string | null }).created_at ?? null,
    last_edited_at: (deck as { last_edited_at?: string | null }).last_edited_at ?? null,
    cards: cardCountsByDeckId.get(deck.id as string) ?? 0,
  }))

  return NextResponse.json({ decks: response })
}

