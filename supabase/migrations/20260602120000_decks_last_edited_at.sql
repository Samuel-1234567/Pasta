-- Track when a deck owner last edited deck metadata or cards.

alter table public.decks
  add column if not exists last_edited_at timestamptz;

comment on column public.decks.last_edited_at is
  'Timestamp of the last user-initiated edit to deck metadata or cards.';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'decks'
      and column_name = 'created_at'
  ) then
    update public.decks
    set last_edited_at = coalesce(created_at, now())
    where last_edited_at is null;
  else
    update public.decks
    set last_edited_at = now()
    where last_edited_at is null;
  end if;
end $$;

alter table public.decks
  alter column last_edited_at set default now(),
  alter column last_edited_at set not null;
