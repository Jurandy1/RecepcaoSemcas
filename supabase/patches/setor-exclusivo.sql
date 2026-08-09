-- SEMCAS · Setor reservado por usuário de agendamento
--
-- O que este script faz:
--  1) O setor escolhido por um usuário de papel "setor" fica reservado só para ele.
--     Um segundo convite não consegue mais usar o mesmo setor.
--  2) Setor digitado manualmente no convite entra automaticamente na lista de
--     setores procurados, para a recepção já encontrar no formulário.
--  3) A tela de aceitar convite (pessoa ainda não logada) passa a conseguir
--     listar os setores que estão livres.
--
-- Rode no SQL Editor do Supabase.

-- ───────────────────────────────────────────────────────────
-- 1. Lista de setores visível também para quem ainda não logou
-- ───────────────────────────────────────────────────────────
drop policy if exists "setores_procurados_select" on public.setores_procurados;

create policy "setores_procurados_select" on public.setores_procurados
  for select to anon, authenticated
  using (true);

-- ───────────────────────────────────────────────────────────
-- 2. Um setor só pode ter um usuário de agendamento
-- ───────────────────────────────────────────────────────────
do $$
begin
  create unique index perfis_setor_unico
    on public.perfis (lower(trim(setor)))
    where papel = 'setor' and setor is not null and trim(setor) <> '';
exception
  when duplicate_table then
    null;
  when unique_violation then
    raise notice 'Há mais de um usuário de setor com o mesmo setor. Desative os repetidos em Usuários e rode este script de novo.';
end $$;

-- ───────────────────────────────────────────────────────────
-- 3. Setores ainda sem responsável (usado na tela de convite)
-- ───────────────────────────────────────────────────────────
create or replace function public.setores_disponiveis()
returns table (nome text)
language sql
stable
security definer
set search_path = public
as $$
  select s.nome
  from public.setores_procurados s
  where s.ativo = true
    and not exists (
      select 1
      from public.perfis p
      where p.papel = 'setor'
        and p.setor is not null
        and lower(trim(p.setor)) = lower(trim(s.nome))
    )
  order by s.nome;
$$;

grant execute on function public.setores_disponiveis() to anon, authenticated;

-- Confere um setor específico, inclusive um nome digitado na mão
create or replace function public.setor_disponivel(p_setor text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.perfis p
    where p.papel = 'setor'
      and p.setor is not null
      and lower(trim(p.setor)) = lower(trim(coalesce(p_setor, '')))
  );
$$;

grant execute on function public.setor_disponivel(text) to anon, authenticated;

-- ───────────────────────────────────────────────────────────
-- 4. aceitar_convite: reserva o setor e cadastra na lista
-- ───────────────────────────────────────────────────────────
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
  v_setor text := nullif(trim(coalesce(p_setor, '')), '');
  v_dono text;
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

  if exists (select 1 from public.perfis where id = v_user_id) then
    raise exception 'Este usuário já possui perfil no sistema';
  end if;

  if v_convite.papel = 'setor' then
    if v_setor is null then
      raise exception 'Informe o nome do setor';
    end if;

    -- O setor pertence a um único usuário de agendamento
    select p.nome into v_dono
    from public.perfis p
    where p.papel = 'setor'
      and p.setor is not null
      and lower(trim(p.setor)) = lower(v_setor)
    limit 1;

    if v_dono is not null then
      raise exception 'O setor "%" já está reservado para %. Escolha outro setor ou fale com a administração.',
        v_setor, v_dono;
    end if;

    -- Setor digitado na mão passa a existir na lista da recepção
    insert into public.setores_procurados (nome)
    values (v_setor)
    on conflict (nome) do nothing;
  end if;

  insert into public.perfis (id, nome, email, papel, setor, ativo)
  values (
    v_user_id,
    trim(p_nome),
    lower(trim(v_email)),
    v_convite.papel,
    case when v_convite.papel = 'setor' then v_setor else null end,
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
    'setor', case when v_convite.papel = 'setor' then v_setor else null end
  );
end;
$$;

grant execute on function public.aceitar_convite(text, text, text) to authenticated;

notify pgrst, 'reload schema';
