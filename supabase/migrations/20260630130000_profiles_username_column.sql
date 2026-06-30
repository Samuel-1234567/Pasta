-- Remote DB was missing username despite earlier migrations; handle_new_user inserts it.

alter table public.profiles
  add column if not exists username text;

comment on column public.profiles.username is
  'Display username; populated from OAuth metadata when available.';

-- Ensure auth signup trigger can call the handler (Supabase hosted).
grant usage on schema public to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin;
grant execute on function public.assign_unique_referral_code() to supabase_auth_admin;
grant execute on function public.generate_referral_code() to supabase_auth_admin;
