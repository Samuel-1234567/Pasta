-- Study activity for dashboard stats (time, cards reviewed, streak).

create table public.study_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  deck_id uuid references public.decks (id) on delete set null,
  event_type text not null,
  quantity integer not null default 1,
  occurred_at timestamptz not null default now(),
  constraint study_events_event_type_check check (
    event_type in ('card_reviewed', 'session_seconds')
  ),
  constraint study_events_quantity_check check (quantity > 0 and quantity <= 86400)
);

create index study_events_profile_occurred_idx
  on public.study_events (profile_id, occurred_at desc);

comment on table public.study_events is
  'Per-user study activity; card_reviewed counts cards seen, session_seconds adds study time.';

alter table public.study_events enable row level security;

create policy study_events_select_own
  on public.study_events for select
  using (profile_id = (select auth.uid()));

create policy study_events_insert_own
  on public.study_events for insert
  with check (profile_id = (select auth.uid()));
