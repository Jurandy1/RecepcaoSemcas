-- SEMCAS · Setores procurados (cadastro para uso no registro/agendamento)
-- Rode no SQL Editor do Supabase

create table if not exists public.setores_procurados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint setores_procurados_nome_unique unique (nome)
);

create index if not exists idx_setores_procurados_nome on public.setores_procurados (nome);
create index if not exists idx_setores_procurados_ativo on public.setores_procurados (ativo);

alter table public.setores_procurados enable row level security;

drop policy if exists "setores_procurados_select" on public.setores_procurados;
drop policy if exists "setores_procurados_write" on public.setores_procurados;

-- Qualquer usuário autenticado pode listar (para o formulário)
create policy "setores_procurados_select" on public.setores_procurados
  for select to authenticated
  using (true);

-- Só admin/coordenadora gerenciam
create policy "setores_procurados_write" on public.setores_procurados
  for all to authenticated
  using (public.eh_gestor())
  with check (public.eh_gestor());
