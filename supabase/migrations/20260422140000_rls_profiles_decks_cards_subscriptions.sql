-- Row level security: owners (and public decks for reads) only.
-- Requires: public.profiles, public.decks, public.cards, public.subscriptions with columns above.

alter table public.profiles enable row level security;
alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: only the row where id = auth.uid()
-- ---------------------------------------------------------------------------

create policy profiles_select_own
  on public.profiles for select
  using (id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles for insert
  with check (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_delete_own
  on public.profiles for delete
  using (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- decks: owner full write; anyone can read public decks or their own
-- ---------------------------------------------------------------------------

create policy decks_select_own_or_public
  on public.decks for select
  using (
    profile_id = (select auth.uid())
    or is_public = true
  );

create policy decks_insert_own
  on public.decks for insert
  with check (profile_id = (select auth.uid()));

create policy decks_update_own
  on public.decks for update
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy decks_delete_own
  on public.decks for delete
  using (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- cards: same visibility as parent deck; only deck owner can write
-- ---------------------------------------------------------------------------

create policy cards_select_via_deck
  on public.cards for select
  using (
    exists (
      select 1
      from public.decks d
      where d.id = cards.deck_id
        and (
          d.profile_id = (select auth.uid())
          or d.is_public = true
        )
    )
  );

create policy cards_insert_deck_owner
  on public.cards for insert
  with check (
    exists (
      select 1
      from public.decks d
      where d.id = deck_id
        and d.profile_id = (select auth.uid())
    )
  );

create policy cards_update_deck_owner
  on public.cards for update
  using (
    exists (
      select 1
      from public.decks d
      where d.id = cards.deck_id
        and d.profile_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.decks d
      where d.id = deck_id
        and d.profile_id = (select auth.uid())
    )
  );

create policy cards_delete_deck_owner
  on public.cards for delete
  using (
    exists (
      select 1
      from public.decks d
      where d.id = cards.deck_id
        and d.profile_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- subscriptions: only the row for this user (user_id = profile / auth id)
-- ---------------------------------------------------------------------------

create policy subscriptions_select_own
  on public.subscriptions for select
  using (user_id = (select auth.uid()));

create policy subscriptions_insert_own
  on public.subscriptions for insert
  with check (user_id = (select auth.uid()));

create policy subscriptions_update_own
  on public.subscriptions for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy subscriptions_delete_own
  on public.subscriptions for delete
  using (user_id = (select auth.uid()));
