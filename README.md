# SEMCAS · Controle de Recepção

Sistema de recepção e agendamento.

**Desenvolvido por Jurandy Santana**

## Papéis

| Papel | Acesso |
|-------|--------|
| **Administrador** | Painel, registrar, visitantes, visitantes cadastrados (histórico), agendamentos, setor procurado, relatório, usuários, convites |
| **Coordenadora** | Painel, registrar, visitantes, visitantes cadastrados (histórico), agendamentos, setor procurado, relatório, usuários, convites |
| **Recepcionista** | Registrar, visitantes, agenda do dia, relatório |
| **Setor** | Agendamentos do próprio setor |

Admin geral: `semcas@gmail.com`

## Como rodar (desenvolvimento)

```bash
npm install
cp .env.example .env
# ou: cp public/config.example.js public/config.js  (preencha URL e anon key)
npm run dev
```

## Preview no balcão **sem Node** (rede corporativa)

Quando a empresa bloqueia instalação do Node:

1. Em um PC com Node, rode `npm run build` (gera a pasta `dist`).
2. No balcão, copie o projeto (com `dist`) e rode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\serve-dist.ps1 -Port 8080
```

3. Abra **http://127.0.0.1:8080/** (use localhost — a webcam não funciona em `http://IP` sem HTTPS).
4. Configure `dist/config.js` (ou `public/config.js` antes do build) com a URL e a chave anon do Supabase.

## Estrutura do código

```
src/
  components/layout/   Shell
  components/ui/       botões, campos, paginação
  components/setores/  seletor e hook de setores
  pages/auth/          login e aceitar convite
  pages/recepcao/      registrar, entradas do dia, agenda
  pages/gestor/        painel, usuários, agendamentos
  pages/setor/         perfil setor (agendamento)
  pages/admin/         convites e setores procurados
  pages/visitantes/    histórico e relatório
  lib/                 supabase, auth, tema, CPF/telefone
supabase/
  schema.sql
  patches/             scripts SQL incrementais
```

## Supabase — SQL obrigatório

Ordem completa em [`supabase/README.md`](supabase/README.md). Resumo:

1. [`supabase/schema.sql`](supabase/schema.sql) — base
2. Patches em [`supabase/patches/`](supabase/patches/) — convites, melhorias, setores, agendamentos, storage, exclusão, fix-admin

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

- Formulário completo: nome (com sugestões), CPF, telefone, setor, observação, foto (webcam)
- Sugestões vêm de **servidores** (pré-lista) e de **visitantes já cadastrados**
- Após registrar, permanece na tela de registro (pronto para o próximo)
- Lista do dia com filtros (servidores / externos / agendados) e atualização a cada 30s
- Relatório do dia: imprimir ou baixar CSV
- Fotos preferencialmente no Storage; se o bucket não existir, o app ainda salva (compatível)

## Auth

Desative **Confirm email** em Authentication → Providers → Email para os convites funcionarem sem atrito.

Se a sessão expirar no PC compartilhado do balcão, o sistema pede login de novo.
