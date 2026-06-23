import { NextResponse } from 'next/server'
import { authorLabelFromProfile, loadProfilesById } from '@/app/lib/community-author'
import { isRemixDeck } from '@/app/lib/deck-origin'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { requireUser } from '@/app/lib/supabase/require-user'

export async function GET() {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()
  const userId = auth.user.id

  const { data: decks, error: decksError } = await supabase
    .from('decks')
    .select('id, name, profile_id, is_public, remixed_from_deck_id')
    .eq('is_public', true)
    .neq('profile_id', userId)
    .order('name', { ascending: true })

  if (decksError) {
    return NextResponse.json({ error: decksError.message }, { status: 500 })
  }

  const profileIds = [...new Set((decks ?? []).map((d) => d.profile_id as string).filter(Boolean))]

  let profileById: Map<string, { username?: string | null; email?: string | null }>
  try {
    profileById = await loadProfilesById(supabase, profileIds)
  } catch (profileError) {
    const message = profileError instanceof Error ? profileError.message : 'Failed to load profiles.'
    return NextResponse.json({ error: message }, { status: 500 })
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
    const name = deck.name as string
    const remixedFromDeckId =
      (deck as { remixed_from_deck_id?: string | null }).remixed_from_deck_id ?? null
    return {
      id: deck.id as string,
      name,
      profile_id: profileId,
      author_label: authorLabelFromProfile(profileById.get(profileId) ?? {}),
      cards: cardCountsByDeckId.get(deck.id as string) ?? 0,
      is_own: profileId === userId,
      is_remix: isRemixDeck({ name, remixed_from_deck_id: remixedFromDeckId }),
    }
  })

  return NextResponse.json({ decks: response })
}
