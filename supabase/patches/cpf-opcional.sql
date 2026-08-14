-- SEMCAS · CPF opcional no registro de visitantes
-- Rode no SQL Editor do Supabase.

alter table public.visitantes
  alter column cpf drop not null;

notify pgrst, 'reload schema';
