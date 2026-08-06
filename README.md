# SEMCAS · Controle de Atendimento

Sistema de recepção e agendamento.

**Desenvolvido por Jurandy Santana**

## Papéis

| Papel | Acesso |
|-------|--------|
| **Administrador** / **Coordenadora** | Tudo: painel, visitantes, agendamentos, usuários, enviar convites |
| **Recepcionista** | Cadastro simples de visitantes + agenda do dia |
| **Setor** | Criar e acompanhar agendamentos do próprio setor |

Admin geral configurado: `semcas@gmail.com`

## Como rodar

```bash
npm install
cp .env.example .env   # preencha URL e chave anon
npm run dev
```

## Supabase — obrigatório

1. No Supabase → **SQL Editor** → New query  
2. Cole o arquivo [`supabase/schema.sql`](supabase/schema.sql)  
3. Clique em **Run**

Isso cria tabelas, políticas e o perfil do admin (`semcas@gmail.com`).

### Auth

Em **Authentication → Providers → Email**, deixe e-mail/senha ativo.  
Se o cadastro por convite pedir confirmação de e-mail e atrapalhar testes, desative temporariamente “Confirm email” em Auth → Settings.

## Fluxo de convites

1. Admin/Coordenadora → menu **Enviar convites**  
2. Informa e-mail + tipo de acesso → gera um **código**  
3. A pessoa abre o login → **Recebi um convite**  
4. Valida o código, cria senha e (se for Setor) informa o **nome do setor**

## Logo

Substitua `public/logo.svg` pelo logo oficial.
