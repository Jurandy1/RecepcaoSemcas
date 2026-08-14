# Supabase — scripts SQL

Execute no **SQL Editor** do Supabase nesta ordem:

1. [`schema.sql`](schema.sql) — base (perfis, visitantes, convites…)
2. [`patches/criar-convites.sql`](patches/criar-convites.sql) — se a tabela convites faltar
3. [`patches/melhorias-recepcao.sql`](patches/melhorias-recepcao.sql) — servidores, observação, índices
4. [`patches/setores-procurados.sql`](patches/setores-procurados.sql) — cadastro de setores procurados
5. [`patches/criar-agendamentos.sql`](patches/criar-agendamentos.sql) — se faltar a tabela agendamentos
6. [`patches/storage-fotos.sql`](patches/storage-fotos.sql) — bucket das fotos (Storage)
7. [`patches/politica-excluir-visitas.sql`](patches/politica-excluir-visitas.sql) — exclusão de visitas (admin/coordenadora)
8. [`patches/setor-exclusivo.sql`](patches/setor-exclusivo.sql) — reserva o setor para um único usuário de agendamento
9. [`patches/cpf-opcional.sql`](patches/cpf-opcional.sql) — CPF deixa de ser obrigatório em visitantes
10. [`patches/fix-admin.sql`](patches/fix-admin.sql) — se o admin não entrar

A pasta `patches/` contém scripts incrementais para bancos já criados. Em instalação nova, rode o `schema.sql` e depois os patches que ainda não estiverem cobertos pelo schema.
