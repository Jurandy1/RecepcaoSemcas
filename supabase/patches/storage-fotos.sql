-- SEMCAS · Storage para fotos de visitantes
-- Rode no SQL Editor do Supabase (Storage → também pode criar o bucket pela UI)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visitantes-fotos',
  'visitantes-fotos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública (URLs no app)
drop policy if exists "visitantes_fotos_public_read" on storage.objects;
create policy "visitantes_fotos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'visitantes-fotos');

-- Upload por usuários autenticados (recepção/gestores)
drop policy if exists "visitantes_fotos_auth_upload" on storage.objects;
create policy "visitantes_fotos_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'visitantes-fotos');

drop policy if exists "visitantes_fotos_auth_update" on storage.objects;
create policy "visitantes_fotos_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'visitantes-fotos')
  with check (bucket_id = 'visitantes-fotos');
