-- SEMCAS · Controle de Atendimento
-- Cole no SQL Editor do Supabase e execute (Run).
-- Desenvolvido por Jurandy Santana
--
-- Admin geral: semcas@gmail.com
-- UID: 4a511454-6452-41da-9f37-270cdc5a6f99

create extension if not exists "pgcrypto";

-- ========== PERFIS ==========
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  papel text not null,
  setor text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Atualiza constraint de papéis (caso a tabela já exista)
alter table public.perfis drop constraint if exists perfis_papel_check;
alter table public.perfis
  add constraint perfis_papel_check
  check (papel in ('admin', 'coordenadora', 'recepcionista', 'setor'));

-- ========== CONVITES ==========
create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  papel text not null check (papel in ('admin', 'coordenadora', 'recepcionista', 'setor')),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'cancelado')),
  criado_por uuid references public.perfis(id),
  aceito_por uuid references public.perfis(id),
  expira_em timestamptz not null default (now() + interval '7 days'),
  criado_em timestamptz not null default now(),
  aceito_em timestamptz
);

create index if not exists idx_convites_token on public.convites (token);
create index if not exists idx_convites_email on public.convites (email);

-- ========== VISITANTES (cadastro na recepção) ==========
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
  agendamento_id uuid,
  registrado_por uuid references public.perfis(id),
  criado_em timestamptz not null default now()
);

alter table public.visitantes add column if not exists agendamento_id uuid;
alter table public.visitantes add column if not exists motivo text;
alter table public.visitantes add column if not exists foto_url text;
alter table public.visitantes add column if not exists tipo text default 'espontanea';
alter table public.visitantes drop column if exists status;

-- ========== AGENDAMENTOS (criados pelos setores) ==========
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

do $$ begin
  alter table public.visitantes
    add constraint visitantes_agendamento_id_fkey
    foreign key (agendamento_id) references public.agendamentos(id);
exception when duplicate_object then null;
end $$;

-- ========== ÍNDICES ==========
create index if not exists idx_visitantes_horario on public.visitantes (horario desc);
create index if not exists idx_visitantes_setor on public.visitantes (setor);
create index if not exists idx_agendamentos_data on public.agendamentos (data, hora);
create index if not exists idx_agendamentos_setor on public.agendamentos (setor);

-- ========== FUNÇÕES AUXILIARES ==========
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

-- Aceitar convite após o usuário criar conta no Auth
create or replace function public.aceitar_convite(
  p_token text,
  p_nome text,
  p_setor text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convite public.convites%rowtype;
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception 'É preciso estar autenticado para aceitar o convite';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  select * into v_convite
  from public.convites
  where token = p_token
    and status = 'pendente'
    and expira_em > now();

  if not found then
    raise exception 'Convite inválido ou expirado';
  end if;

  if lower(trim(v_email)) <> lower(trim(v_convite.email)) then
    raise exception 'Este convite foi enviado para outro e-mail';
  end if;

  if v_convite.papel = 'setor' and (p_setor is null or trim(p_setor) = '') then
    raise exception 'Informe o nome do setor';
  end if;

  if exists (select 1 from public.perfis where id = v_user_id) then
    raise exception 'Este usuário já possui perfil no sistema';
  end if;

  insert into public.perfis (id, nome, email, papel, setor, ativo)
  values (
    v_user_id,
    trim(p_nome),
    lower(trim(v_email)),
    v_convite.papel,
    case when v_convite.papel = 'setor' then trim(p_setor) else null end,
    true
  );

  update public.convites
  set status = 'aceito',
      aceito_por = v_user_id,
      aceito_em = now()
  where id = v_convite.id;

  return jsonb_build_object(
    'ok', true,
    'papel', v_convite.papel,
    'setor', case when v_convite.papel = 'setor' then trim(p_setor) else null end
  );
end;
$$;

grant execute on function public.aceitar_convite(text, text, text) to authenticated;

-- ========== RLS ==========
alter table public.perfis enable row level security;
alter table public.convites enable row level security;
alter table public.visitantes enable row level security;
alter table public.agendamentos enable row level security;

-- Limpa políticas antigas
drop policy if exists "perfis_select" on public.perfis;
drop policy if exists "perfis_update_own" on public.perfis;
drop policy if exists "perfis_all_gestor" on public.perfis;
drop policy if exists "perfis_select_auth" on public.perfis;
drop policy if exists "perfis_update_gestor" on public.perfis;
drop policy if exists "convites_gestor" on public.convites;
drop policy if exists "convites_select_token" on public.convites;
drop policy if exists "visitantes_all" on public.visitantes;
drop policy if exists "visitantes_auth" on public.visitantes;
drop policy if exists "agendamentos_auth" on public.agendamentos;
drop policy if exists "conversas_all" on public.conversas;
drop policy if exists "mensagens_all" on public.mensagens;
drop policy if exists "avisos_all" on public.avisos_visita;

-- Perfis
create policy "perfis_select_auth" on public.perfis
  for select to authenticated using (true);

create policy "perfis_update_gestor" on public.perfis
  for update to authenticated
  using (public.eh_gestor() or auth.uid() = id)
  with check (public.eh_gestor() or auth.uid() = id);

-- Convites: gestores gerenciam; qualquer um pode ler convite pendente (para validar token)
create policy "convites_gestor_all" on public.convites
  for all to authenticated
  using (public.eh_gestor())
  with check (public.eh_gestor());

create policy "convites_select_pendente" on public.convites
  for select to anon, authenticated
  using (status = 'pendente' and expira_em > now());

-- Visitantes: todos autenticados ativos
create policy "visitantes_auth" on public.visitantes
  for all to authenticated
  using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.ativo))
  with check (exists (select 1 from public.perfis p where p.id = auth.uid() and p.ativo));

-- Agendamentos: gestores veem tudo; setor vê/cria do próprio setor; recepção vê tudo
create policy "agendamentos_select" on public.agendamentos
  for select to authenticated
  using (
    public.eh_gestor()
    or public.meu_papel() = 'recepcionista'
    or (public.meu_papel() = 'setor' and setor = public.meu_setor())
  );

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

-- ========== ADMIN GERAL (já criado no Auth) ==========
insert into public.perfis (id, nome, email, papel, ativo)
values (
  '4a511454-6452-41da-9f37-270cdc5a6f99',
  'Administrador Geral',
  'semcas@gmail.com',
  'admin',
  true
)
on conflict (id) do update
set nome = excluded.nome,
    email = excluded.email,
    papel = 'admin',
    ativo = true;

-- Se o admin logar e ainda não tiver perfil, cria automaticamente
create or replace function public.garantir_perfil_admin()
returns public.perfis
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfis%rowtype;
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_perfil from public.perfis where id = v_uid;
  if found then
    return v_perfil;
  end if;

  select email into v_email from auth.users where id = v_uid;

  if v_uid = '4a511454-6452-41da-9f37-270cdc5a6f99'
     or lower(coalesce(v_email, '')) = 'semcas@gmail.com' then
    insert into public.perfis (id, nome, email, papel, ativo)
    values (v_uid, 'Administrador Geral', 'semcas@gmail.com', 'admin', true)
    on conflict (id) do update
      set papel = 'admin', email = 'semcas@gmail.com', ativo = true
    returning * into v_perfil;
    return v_perfil;
  end if;

  return null;
end;
$$;

grant execute on function public.garantir_perfil_admin() to authenticated;
