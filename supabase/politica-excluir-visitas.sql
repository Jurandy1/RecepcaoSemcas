-- Restringe exclusão de visitas a admin e coordenadora
-- Rode no SQL Editor após melhorias-recepcao.sql

drop policy if exists "visitantes_auth" on public.visitantes;
drop policy if exists "visitantes_select" on public.visitantes;
drop policy if exists "visitantes_insert" on public.visitantes;
drop policy if exists "visitantes_update" on public.visitantes;
drop policy if exists "visitantes_delete" on public.visitantes;

create policy "visitantes_select" on public.visitantes
  for select to authenticated
  using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.ativo));

create policy "visitantes_insert" on public.visitantes
  for insert to authenticated
  with check (exists (select 1 from public.perfis p where p.id = auth.uid() and p.ativo));

create policy "visitantes_update" on public.visitantes
  for update to authenticated
  using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.ativo));

create policy "visitantes_delete" on public.visitantes
  for delete to authenticated
  using (public.eh_gestor());

notify pgrst, 'reload schema';
