# SEMCAS · Controle de Atendimento

Sistema de recepção e controle de visitas.

**Desenvolvido por Jurandy Santana**

## Como rodar

```bash
npm install
npm run dev
```

## Configuração Supabase

1. Copie `.env.example` para `.env` e preencha URL + chave **anon**.
2. No painel do Supabase → **SQL Editor** → New query.
3. Cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.

Isso cria as tabelas: `perfis`, `visitantes`, `conversas`, `mensagens`, `avisos_visita`.

> A chave `service_role` não deve ir no frontend nem no GitHub.

## Logo

Substitua `public/logo.svg` pelo logo oficial.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Ambiente local |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
