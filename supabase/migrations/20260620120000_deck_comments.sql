-- Comments on public decks.

create table public.deck_comments (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint deck_comments_body_length check (
    char_length(body) >= 1 and char_length(body) <= 2000
  )
);

create index deck_comments_deck_created_idx
  on public.deck_comments (deck_id, created_at desc);

comment on table public.deck_comments is
  'Comments left by authenticated users on public decks.';

alter table public.deck_comments enable row level security;

create policy deck_comments_select_public_deck
  on public.deck_comments for select
  using (
    exists (
      select 1
      from public.decks d
      where d.id = deck_comments.deck_id
        and (
          d.is_public = true
          or d.profile_id = (select auth.uid())
        )
    )
  );

create policy deck_comments_insert_public_deck
  on public.deck_comments for insert
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1
      from public.decks d
      where d.id = deck_id
        and d.is_public = true
    )
  );

create policy deck_comments_delete_own
  on public.deck_comments for delete
  using (profile_id = (select auth.uid()));
