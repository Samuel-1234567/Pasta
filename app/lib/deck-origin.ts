export type DeckOrigin = 'yours' | 'remix'

type DeckOriginInput = {
  name?: string | null
  remixed_from_deck_id?: string | null
}

export function isRemixDeck(deck: DeckOriginInput): boolean {
  if (deck.remixed_from_deck_id) return true
  return (deck.name?.trim() ?? '').toLowerCase().endsWith('(remix)')
}

export function deckOrigin(deck: DeckOriginInput): DeckOrigin {
  return isRemixDeck(deck) ? 'remix' : 'yours'
}
