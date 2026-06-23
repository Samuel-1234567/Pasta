-- Track decks created by remixing another deck.

alter table public.decks
  add column if not exists remixed_from_deck_id uuid references public.decks (id) on delete set null;

create index if not exists decks_remixed_from_deck_id_idx
  on public.decks (remixed_from_deck_id)
  where remixed_from_deck_id is not null;

comment on column public.decks.remixed_from_deck_id is
  'Source deck id when this deck was created via remix.';
