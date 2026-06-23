-- Username + Discord metadata on signup.

alter table public.profiles
  add column if not exists username text;

comment on column public.profiles.username is
  'Display username; populated from Discord OAuth when available.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  discord_username text;
  discord_avatar text;
begin
  discord_username := nullif(trim(coalesce(
    meta->>'user_name',
    meta->>'preferred_username',
    meta->>'name',
    meta->>'full_name',
    meta->'custom_claims'->>'global_name'
  )), '');

  discord_avatar := nullif(trim(meta->>'avatar_url'), '');

  if discord_avatar is null
    and nullif(trim(meta->>'avatar'), '') is not null
    and nullif(trim(meta->>'provider_id'), '') is not null then
    discord_avatar := format(
      'https://cdn.discordapp.com/avatars/%s/%s.png',
      meta->>'provider_id',
      meta->>'avatar'
    );
  end if;

  insert into public.profiles (id, email, username, avatar_url)
  values (new.id, new.email, discord_username, discord_avatar)
  on conflict (id) do update
    set email = coalesce(excluded.email, profiles.email),
        username = coalesce(profiles.username, excluded.username),
        avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;
