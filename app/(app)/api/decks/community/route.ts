import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function authorLabelFromEmail(email: string | null | undefined) {
  if (!email) return 'Community member'
  const local = email.split('@')[0]?.trim()
  return local || 'Community member'
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId || !isUuid(userId)) {
    return NextResponse.json({ error: 'Missing or invalid userId.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  const { data: decks, error: decksError } = await supabase
    .from('decks')
    .select('id, name, profile_id, is_public')
    .eq('is_public', true)
    .neq('profile_id', userId)
    .order('name', { ascending: true })

  if (decksError) {
    return NextResponse.json({ error: decksError.message }, { status: 500 })
  }

  const profileIds = [...new Set((decks ?? []).map((d) => d.profile_id as string).filter(Boolean))]

  const emailByProfileId = new Map<string, string>()
  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', profileIds)

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    for (const profile of profiles ?? []) {
      const id = profile.id as string
      const email = (profile as { email?: string | null }).email
      if (id && email) emailByProfileId.set(id, email)
    }
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

  const response = (decks ?? []).map((deck) => {
    const profileId = deck.profile_id as string
    return {
      id: deck.id as string,
      name: deck.name as string,
      profile_id: profileId,
      author_label: authorLabelFromEmail(emailByProfileId.get(profileId)),
      cards: cardCountsByDeckId.get(deck.id as string) ?? 0,
    }
  })

  return NextResponse.json({ decks: response })
}
