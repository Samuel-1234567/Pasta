-- Referred users inherit the referrer's profile email (bound to referrer account).

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
  profile_email text;
  meta_referral_code text;
  referred_email text := null;
  referrer_id uuid;
  referrer_email text;
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

  meta_referral_code := upper(nullif(trim(meta->>'referral_code'), ''));
  if meta_referral_code is not null and meta_referral_code ~ '^[A-Z0-9]{6}$' then
    select p.id, lower(trim(p.email))
    into referrer_id, referrer_email
    from public.profiles p
    where p.referral_code = meta_referral_code
    limit 1;

    if referrer_id is not null
       and referrer_id <> new.id
       and referrer_email is not null
       and (
         new.email is null
         or lower(trim(new.email)) <> referrer_email
       ) then
      referred_email := referrer_email;
    end if;
  end if;

  profile_email := coalesce(referred_email, nullif(lower(trim(new.email)), ''));
  profile_referral_code := public.assign_unique_referral_code();

  insert into public.profiles (id, email, username, avatar_url, referral_code, referred_by_email)
  values (new.id, profile_email, profile_username, profile_avatar, profile_referral_code, referred_email)
  on conflict (id) do update
    set email = case
          when profiles.referred_by_email is not null then profiles.email
          when excluded.referred_by_email is not null then excluded.email
          else coalesce(excluded.email, profiles.email)
        end,
        username = coalesce(profiles.username, excluded.username),
        avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url),
        referral_code = coalesce(profiles.referral_code, excluded.referral_code),
        referred_by_email = coalesce(profiles.referred_by_email, excluded.referred_by_email);

  return new;
end;
$$;

comment on column public.profiles.referred_by_email is
  'Email of the user who referred this profile. Referred profiles use this email as profiles.email.';

update public.profiles
set email = referred_by_email
where referred_by_email is not null
  and email is distinct from referred_by_email;
