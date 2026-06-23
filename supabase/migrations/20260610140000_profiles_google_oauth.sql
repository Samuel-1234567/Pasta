-- Populate profile name/avatar from Google OAuth metadata on signup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  profile_username text;
  profile_avatar text;
begin
  profile_username := nullif(trim(coalesce(
    meta->>'full_name',
    meta->>'name',
    meta->>'given_name',
    meta->>'user_name',
    meta->>'preferred_username',
    meta->'custom_claims'->>'global_name'
  )), '');

  profile_avatar := nullif(trim(coalesce(
    meta->>'avatar_url',
    meta->>'picture'
  )), '');

  if profile_avatar is null
    and nullif(trim(meta->>'avatar'), '') is not null
    and nullif(trim(meta->>'provider_id'), '') is not null then
    profile_avatar := format(
      'https://cdn.discordapp.com/avatars/%s/%s.png',
      meta->>'provider_id',
      meta->>'avatar'
    );
  end if;

  insert into public.profiles (id, email, username, avatar_url)
  values (new.id, new.email, profile_username, profile_avatar)
  on conflict (id) do update
    set email = coalesce(excluded.email, profiles.email),
        username = coalesce(profiles.username, excluded.username),
        avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;
