-- Referral codes: each profile gets a shareable code (referrer id + email).
-- New users who sign up with a code are bound to the referrer's email.

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by_email text;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

create index if not exists profiles_referred_by_email_idx
  on public.profiles (referred_by_email)
  where referred_by_email is not null;

comment on column public.profiles.referral_code is
  'Unique 6-character shareable referral code for this profile.';

comment on column public.profiles.referred_by_email is
  'Email of the user who referred this profile, set when signing up with a referral code.';

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

update public.profiles
set referral_code = public.assign_unique_referral_code()
where referral_code is null
  and email is not null
  and trim(email) <> '';

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
