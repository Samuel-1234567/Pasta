-- Profile picture URL (served via /api/profile-avatars/serve).

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'Same-origin path to the user avatar image (e.g. /api/profile-avatars/serve?path=...).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile avatars public read" on storage.objects;

create policy "Profile avatars public read"
  on storage.objects for select
  to public
  using (bucket_id = 'profile-avatars');
