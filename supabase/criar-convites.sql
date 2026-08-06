-- Rode este arquivo no SQL Editor se aparecer:
-- "Could not find the table 'public.convites'"
-- Depois clique em Reload schema (ou aguarde alguns segundos).

create extension if not exists "pgcrypto";

-- Garante função usada nas políticas (caso o schema completo ainda não tenha sido rodado)
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

alter table public.convites enable row level security;

drop policy if exists "convites_gestor_all" on public.convites;
drop policy if exists "convites_select_pendente" on public.convites;

create policy "convites_gestor_all" on public.convites
  for all to authenticated
  using (public.eh_gestor())
  with check (public.eh_gestor());

create policy "convites_select_pendente" on public.convites
  for select to anon, authenticated
  using (status = 'pendente' and expira_em > now());

-- Função de aceitar convite (caso ainda não exista)
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

notify pgrst, 'reload schema';
