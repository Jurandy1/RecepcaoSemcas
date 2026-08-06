-- Rode este SQL se o login do admin falhar (conta sem perfil).
-- Admin: semcas@gmail.com / 4a511454-6452-41da-9f37-270cdc5a6f99

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
