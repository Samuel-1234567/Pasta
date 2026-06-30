-- Short 6-character referral codes stored in profiles.referral_code.

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.assign_unique_referral_code()
returns text
language plpgsql
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := public.generate_referral_code();
    exit when not exists (
      select 1 from public.profiles where referral_code = candidate
    );
    attempts := attempts + 1;
    if attempts > 100 then
      raise exception 'Could not generate unique referral code';
    end if;
  end loop;
  return candidate;
end;
$$;

drop function if exists public.encode_referral_code(uuid, text);

comment on column public.profiles.referral_code is
  'Unique 6-character shareable referral code for this profile.';

do $$
declare
  profile_row record;
  new_code text;
begin
  for profile_row in
    select id
    from public.profiles
    where referral_code is null
       or referral_code !~ '^[A-Z0-9]{6}$'
  loop
    new_code := public.assign_unique_referral_code();
    update public.profiles
    set referral_code = new_code
    where id = profile_row.id;
  end loop;
end;
$$;

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
  profile_referral_code text;
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

  profile_referral_code := public.assign_unique_referral_code();

  insert into public.profiles (id, email, username, avatar_url, referral_code)
  values (new.id, new.email, profile_username, profile_avatar, profile_referral_code)
  on conflict (id) do update
    set email = coalesce(excluded.email, profiles.email),
        username = coalesce(profiles.username, excluded.username),
        avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url),
        referral_code = coalesce(profiles.referral_code, excluded.referral_code);

  return new;
end;
$$;
