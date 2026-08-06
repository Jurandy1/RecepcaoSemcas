-- SEMCAS · Controle de Atendimento
-- Cole este arquivo no SQL Editor do Supabase e execute (Run).
-- Desenvolvido por Jurandy Santana

-- Extensão para UUIDs
create extension if not exists "pgcrypto";

-- Perfis de usuário (vinculados ao Auth do Supabase)
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  papel text not null check (papel in ('recepcao', 'setor', 'admin')),
  setor text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Visitantes / atendimento diário
create table if not exists public.visitantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text not null,
  telefone text,
  setor text not null,
  motivo text,
  foto_url text,
  tipo text not null default 'espontanea' check (tipo in ('espontanea', 'agendada')),
  horario timestamptz not null default now(),
  sala text,
  atendente text,
  registrado_por uuid references public.perfis(id),
  criado_em timestamptz not null default now()
);

-- Conversas do chat interno
create table if not exists public.conversas (
  id uuid primary key default gen_random_uuid(),
  setor text not null,
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

-- Mensagens do chat
create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  autor_papel text not null check (autor_papel in ('recepcao', 'setor')),
  autor_id uuid references public.perfis(id),
  tipo text not null default 'texto' check (tipo in ('texto', 'aviso_visita')),
  texto text,
  payload jsonb,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Avisos de visita enviados pelo setor
create table if not exists public.avisos_visita (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_prevista date not null,
  hora_prevista time not null,
  sala text,
  atendente text,
  observacao text,
  setor text not null,
  criado_por uuid references public.perfis(id),
  criado_em timestamptz not null default now()
);

-- Índices
create index if not exists idx_visitantes_horario on public.visitantes (horario desc);
create index if not exists idx_visitantes_setor on public.visitantes (setor);
create index if not exists idx_mensagens_conversa on public.mensagens (conversa_id, criado_em);
create index if not exists idx_avisos_data on public.avisos_visita (data_prevista);

-- RLS
alter table public.perfis enable row level security;
alter table public.visitantes enable row level security;
alter table public.conversas enable row level security;
alter table public.mensagens enable row level security;
alter table public.avisos_visita enable row level security;

-- Políticas: usuários autenticados podem ler/escrever (ajuste depois por papel se precisar)
create policy "perfis_select" on public.perfis for select to authenticated using (true);
create policy "perfis_update_own" on public.perfis for update to authenticated using (auth.uid() = id);

create policy "visitantes_all" on public.visitantes for all to authenticated using (true) with check (true);
create policy "conversas_all" on public.conversas for all to authenticated using (true) with check (true);
create policy "mensagens_all" on public.mensagens for all to authenticated using (true) with check (true);
create policy "avisos_all" on public.avisos_visita for all to authenticated using (true) with check (true);

-- Realtime no chat (opcional: ative também em Database → Replication)
alter publication supabase_realtime add table public.mensagens;
alter publication supabase_realtime add table public.visitantes;
