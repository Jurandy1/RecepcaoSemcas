-- SEMCAS · Melhorias da recepção
-- Cole no SQL Editor e execute (Run).
-- Seguro rodar de novo (idempotente).
-- Desenvolvido por Jurandy Santana

create extension if not exists "pgcrypto";

do $$ begin
  create extension if not exists pg_trgm;
exception when others then null;
end $$;

-- ========== SERVIDORES (pré-lista do CSV) ==========
create table if not exists public.servidores (
  id uuid primary key default gen_random_uuid(),
  matricula text not null,
  nome text not null,
  lotacao text not null,
  cargo text,
  cargo_comissionado text,
  admissao date,
  cpf text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Unique em CPF (42P07 = relation already exists)
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'servidores_cpf_key'
  ) then
    alter table public.servidores add constraint servidores_cpf_key unique (cpf);
  end if;
exception
  when duplicate_object then null;
  when duplicate_table then null;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'servidores_matricula_lotacao_key'
  ) then
    alter table public.servidores
      add constraint servidores_matricula_lotacao_key unique (matricula, lotacao);
  end if;
exception
  when duplicate_object then null;
  when duplicate_table then null;
end $$;

create index if not exists idx_servidores_nome on public.servidores (nome);
create index if not exists idx_servidores_lotacao on public.servidores (lotacao);
create index if not exists idx_servidores_cpf on public.servidores (cpf);

do $$ begin
  execute 'create index if not exists idx_servidores_nome_trgm on public.servidores using gin (nome gin_trgm_ops)';
exception when others then null;
end $$;

-- ========== VISITANTES: observação + vínculo servidor ==========
alter table public.visitantes add column if not exists observacao text;
alter table public.visitantes add column if not exists servidor_id uuid;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'visitantes_servidor_id_fkey'
  ) then
    alter table public.visitantes
      add constraint visitantes_servidor_id_fkey
      foreign key (servidor_id) references public.servidores(id);
  end if;
exception
  when duplicate_object then null;
  when duplicate_table then null;
end $$;

create index if not exists idx_visitantes_cpf on public.visitantes (cpf);
create index if not exists idx_visitantes_nome on public.visitantes (nome);
create index if not exists idx_visitantes_horario on public.visitantes (horario desc);

-- ========== RLS SERVIDORES ==========
alter table public.servidores enable row level security;

drop policy if exists "servidores_select" on public.servidores;
drop policy if exists "servidores_gestor_write" on public.servidores;
drop policy if exists "servidores_update_cpf" on public.servidores;

create policy "servidores_select" on public.servidores
  for select to authenticated
  using (true);

create policy "servidores_gestor_write" on public.servidores
  for all to authenticated
  using (public.eh_gestor())
  with check (public.eh_gestor());

-- Recepcionista também pode completar CPF ao registrar visita
create policy "servidores_update_cpf" on public.servidores
  for update to authenticated
  using (
    exists (
      select 1 from public.perfis p
      where p.id = auth.uid() and p.ativo
        and p.papel in ('admin', 'coordenadora', 'recepcionista')
    )
  )
  with check (
    exists (
      select 1 from public.perfis p
      where p.id = auth.uid() and p.ativo
        and p.papel in ('admin', 'coordenadora', 'recepcionista')
    )
  );

notify pgrst, 'reload schema';
