# SEMCAS · Controle de Recepção

Sistema de recepção e agendamento.

**Desenvolvido por Jurandy Santana**

## Papéis

| Papel | Acesso |
|-------|--------|
| **Administrador** | Painel, registrar, visitantes, visitantes cadastrados (histórico), agendamentos, relatório, usuários, convites |
| **Coordenadora** | Painel, registrar, visitantes, agendamentos, relatório, usuários, convites |
| **Recepcionista** | Registrar, visitantes, agenda do dia, relatório |
| **Setor** | Agendamentos do próprio setor |

Admin geral: `semcas@gmail.com`

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

## Supabase — SQL obrigatório

Execute nesta ordem no **SQL Editor**:

1. [`supabase/schema.sql`](supabase/schema.sql) — base (perfis, visitantes, convites…)
2. [`supabase/criar-convites.sql`](supabase/criar-convites.sql) — se a tabela convites faltar
3. [`supabase/melhorias-recepcao.sql`](supabase/melhorias-recepcao.sql) — **servidores**, observação, índices
4. [`supabase/fix-admin.sql`](supabase/fix-admin.sql) — se o admin não entrar

### Importar servidores (CSV)

O arquivo está em `data/servidores.csv` (~21 mil registros).

No `.env` local (nunca no Vercel):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_secreta
```

```bash
npm run import:servidores
```

## Fluxo da recepção

- Formulário completo: nome (com sugestões), CPF, telefone, setor, observação
- Sugestões vêm de **servidores** (pré-lista) e de **visitantes já cadastrados**
- Após registrar, abre a tela **Visitantes**
- Relatório do dia: imprimir ou baixar CSV

## Auth

Desative **Confirm email** em Authentication → Providers → Email para os convites funcionarem sem atrito.
