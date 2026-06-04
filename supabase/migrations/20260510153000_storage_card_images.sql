-- Public bucket for flashcard images uploaded via API (serve with getPublicUrl).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Card images public read" on storage.objects;

create policy "Card images public read"
  on storage.objects for select
  to public
  using (bucket_id = 'card-images');
