-- Track which OAuth provider was used last so linked accounts show the right avatar.

alter table public.profiles
  add column if not exists last_auth_provider text;

comment on column public.profiles.last_auth_provider is
  'Most recent OAuth sign-in provider for this user (google or discord).';
