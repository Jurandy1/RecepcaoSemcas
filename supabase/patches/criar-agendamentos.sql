-- SEMCAS · Cria tabela agendamentos (se ainda não existir)
-- Cole no SQL Editor do Supabase e clique em Run.

create extension if not exists "pgcrypto";

-- Funções usadas nas policies (idempotentes)
create or replace function public.meu_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel from public.perfis where id = auth.uid() and ativo = true;
$$;

create or replace function public.eh_gestor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid()
      and papel in ('admin', 'coordenadora')
      and ativo = true
  );
$$;

create or replace function public.meu_setor()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select setor from public.perfis where id = auth.uid();
$$;

create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  nome_visitante text not null,
  cpf text,
  telefone text,
  data date not null,
  hora time not null,
  sala text,
  observacao text,
  setor text not null,
  status text not null default 'agendado' check (status in ('agendado', 'chegou', 'cancelado')),
  criado_por uuid references public.perfis(id),
  criado_em timestamptz not null default now()
);

create index if not exists idx_agendamentos_data on public.agendamentos (data, hora);
create index if not exists idx_agendamentos_setor on public.agendamentos (setor);

-- Coluna opcional em visitantes para vincular chegada
alter table public.visitantes add column if not exists agendamento_id uuid;

do $$ begin
  alter table public.visitantes
    add constraint visitantes_agendamento_id_fkey
    foreign key (agendamento_id) references public.agendamentos(id);
exception when duplicate_object then null;
end $$;

alter table public.agendamentos enable row level security;

drop policy if exists "agendamentos_auth" on public.agendamentos;
drop policy if exists "agendamentos_select" on public.agendamentos;
drop policy if exists "agendamentos_insert" on public.agendamentos;
drop policy if exists "agendamentos_update" on public.agendamentos;

-- Gestores e recepção veem tudo; setor só o próprio setor
create policy "agendamentos_select" on public.agendamentos
  for select to authenticated
  using (
    public.eh_gestor()
    or public.meu_papel() = 'recepcionista'
    or (public.meu_papel() = 'setor' and setor = public.meu_setor())
  );

-- Admin, coordenadora e setor (do próprio setor) podem criar
create policy "agendamentos_insert" on public.agendamentos
  for insert to authenticated
  with check (
    public.eh_gestor()
    or (public.meu_papel() = 'setor' and setor = public.meu_setor())
  );

create policy "agendamentos_update" on public.agendamentos
  for update to authenticated
  using (
    public.eh_gestor()
    or public.meu_papel() = 'recepcionista'
    or (public.meu_papel() = 'setor' and setor = public.meu_setor())
  );

-- Atualiza o cache do PostgREST (schema cache)
notify pgrst, 'reload schema';
