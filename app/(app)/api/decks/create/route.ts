import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'

type CreateDeckPayload = {
  userId: string
  name: string
  isPublic?: boolean
  cards: Array<{ front: string; back: string }>
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CreateDeckPayload | null
  const userId = String(body?.userId ?? '').trim()
  const name = String(body?.name ?? '').trim()
  const isPublic = Boolean(body?.isPublic)
  const cards = Array.isArray(body?.cards) ? body!.cards : []

  if (!isUuid(userId)) return NextResponse.json({ error: 'Invalid userId.' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Deck name is required.' }, { status: 400 })
  if (cards.length === 0) return NextResponse.json({ error: 'Add at least one card.' }, { status: 400 })

  const cleanedCards = cards
    .map((c) => ({
      front: String(c?.front ?? '').trim(),
      back: String(c?.back ?? '').trim(),
    }))
    .filter((c) => c.front.length > 0 && c.back.length > 0)
    .slice(0, 200)

  if (cleanedCards.length === 0) {
    return NextResponse.json({ error: 'All cards are empty.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  const { data: insertedDeck, error: deckError } = await supabase
    .from('decks')
    .insert({ profile_id: userId, name, is_public: isPublic })
    .select('id')
    .single()

  if (deckError || !insertedDeck?.id) {
    return NextResponse.json({ error: deckError?.message ?? 'Failed to create deck.' }, { status: 500 })
  }

  const deckId = insertedDeck.id as string

  const cardRows = cleanedCards.map((c, idx) => ({
    deck_id: deckId,
    front: c.front,
    back: c.back,
    position: idx,
  }))

  const { error: cardsError } = await supabase.from('cards').insert(cardRows)
  if (cardsError) {
    await supabase.from('decks').delete().eq('id', deckId)
    return NextResponse.json({ error: cardsError.message }, { status: 500 })
  }

  return NextResponse.json({ deckId })
}

