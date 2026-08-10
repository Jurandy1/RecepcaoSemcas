import { useMemo, useState } from 'react'
import {
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  ContactRound,
  FileText,
  LayoutDashboard,
  MailPlus,
  UserPlus,
  Users,
} from 'lucide-react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { supabaseConfigured } from './lib/supabase'
import Shell from './components/layout/Shell'
import Login from './pages/auth/Login'
import AceitarConvite from './pages/auth/AceitarConvite'
import Recepcionista from './pages/recepcao'
import Setor from './pages/setor/Setor'
import EnviarConvites from './pages/admin/EnviarConvites'
import RelatorioDia from './pages/visitantes/RelatorioDia'
import VisitantesCadastrados from './pages/visitantes/VisitantesCadastrados'
import SetoresProcurados from './pages/admin/SetoresProcurados'
import { PainelGestor, Usuarios, AgendamentosGestor } from './pages/gestor'

function TelaAviso({ titulo, children, acoes }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg card shadow-e2">
        <div className="card-topbar" />
        <div className="p-6 sm:p-8 space-y-4">
          <h1 className="font-display text-xl font-bold text-blue-dark">{titulo}</h1>
          <div className="text-sm leading-relaxed text-gray-60 space-y-3">{children}</div>
          {acoes && <div className="flex flex-wrap gap-3 pt-2">{acoes}</div>}
        </div>
      </div>
    </div>
  )
}

function ConfiguracaoPendente() {
  return (
    <TelaAviso titulo="Configuração do Supabase necessária">
      <p>O sistema está sem a URL e a chave do banco.</p>
      <ol className="space-y-2 list-decimal pl-5 text-gray-80">
        <li>
          <strong>No Vercel:</strong> Project Settings → Environment Variables → adicione{' '}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (mesmo valor do
          Supabase → Project Settings → API) e faça um novo deploy.
        </li>
        <li>
          <strong>Local / balcão:</strong> copie <code>public/config.example.js</code> para{' '}
          <code>public/config.js</code> e preencha URL e chave anon.
        </li>
      </ol>
    </TelaAviso>
  )
}

function lerTokenConvite() {
  try {
    return new URLSearchParams(window.location.search).get('convite') || ''
  } catch {
    return ''
  }
}

function menusPorPapel(papel) {
  if (papel === 'recepcionista') {
    return [
      { grupo: 'Recepção' },
      { id: 'home', label: 'Registrar', icon: UserPlus },
      { id: 'visitantes', label: 'Entradas de hoje', icon: ClipboardList },
      { id: 'agenda', label: 'Agenda de hoje', icon: CalendarClock },
      { grupo: 'Consulta' },
      { id: 'agendamentos', label: 'Agendamentos', icon: Calendar },
      { id: 'relatorio', label: 'Relatório do dia', icon: FileText },
    ]
  }
  if (papel === 'setor') {
    return [
      { id: 'home', label: 'Meus agendamentos', icon: CalendarCheck },
      { id: 'novo', label: 'Novo agendamento', icon: CalendarPlus },
    ]
  }

  return [
    { grupo: 'Recepção' },
    { id: 'home', label: 'Painel', icon: LayoutDashboard },
    { id: 'registrar', label: 'Registrar visitante', icon: UserPlus },
    { id: 'visitantes', label: 'Entradas de hoje', icon: ClipboardList },
    { id: 'agenda', label: 'Agenda de hoje', icon: CalendarClock },
    { grupo: 'Agenda' },
    { id: 'agendar', label: 'Agendar visita', icon: CalendarPlus },
    { id: 'agendamentos', label: 'Agendamentos', icon: Calendar },
    { grupo: 'Cadastros' },
    { id: 'cadastrados', label: 'Base de visitantes', icon: ContactRound },
    { id: 'setores', label: 'Setores', icon: Building2 },
    { grupo: 'Administração' },
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'convites', label: 'Enviar convites', icon: MailPlus },
    { id: 'relatorio', label: 'Relatório do dia', icon: FileText },
  ]
}

function AppInterno() {
  const { loading, isLoggedIn, perfil, logout, sessaoExpirada } = useAuth()
  const tokenUrl = useMemo(() => lerTokenConvite(), [])
  const [telaPublica, setTelaPublica] = useState(tokenUrl ? 'aceitar' : 'login')
  const [pagina, setPagina] = useState('home')

  function limparQueryConvite() {
    if (window.location.search.includes('convite=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-sm font-medium text-gray-20">
        Carregando...
      </div>
    )
  }

  if (!isLoggedIn) {
    if (telaPublica === 'aceitar') {
      return (
        <AceitarConvite
          tokenInicial={tokenUrl}
          onVoltar={() => {
            limparQueryConvite()
            setTelaPublica('login')
          }}
        />
      )
    }
    return (
      <>
        {sessaoExpirada && (
          <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-semibold bg-warning-bg text-warning-dark">
            Sessão expirada. Faça login de novo.
          </div>
        )}
        <Login onIrAceitar={() => setTelaPublica('aceitar')} />
      </>
    )
  }

  if (!perfil) {
    return (
      <TelaAviso
        titulo="Conta sem perfil no sistema"
        acoes={
          <>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                logout()
                setTelaPublica('aceitar')
              }}
            >
              Ir para Aceitar convite
            </button>
            <button type="button" className="btn btn-ghost btn-md" onClick={logout}>
              Sair
            </button>
          </>
        }
      >
        <p>Sua conta ainda não tem perfil cadastrado. Use a tela de Aceitar convite com o link recebido.</p>
      </TelaAviso>
    )
  }

  if (!perfil.ativo) {
    return (
      <TelaAviso
        titulo="Acesso desativado"
        acoes={
          <button type="button" className="btn btn-primary btn-md" onClick={logout}>
            Sair
          </button>
        }
      >
        <p>Seu acesso está desativado. Fale com a administração para reativar.</p>
      </TelaAviso>
    )
  }

  const menus = menusPorPapel(perfil.papel)
  const ehGestor = perfil.papel === 'admin' || perfil.papel === 'coordenadora'

  let conteudo = null
  if (perfil.papel === 'recepcionista') {
    if (pagina === 'relatorio') conteudo = <RelatorioDia />
    else if (pagina === 'agendamentos') conteudo = <AgendamentosGestor modoInicial="lista" podeAgendar={false} />
    else conteudo = <Recepcionista pagina={pagina} />
  } else if (perfil.papel === 'setor') {
    conteudo = <Setor pagina={pagina} />
  } else if (ehGestor) {
    if (pagina === 'registrar') conteudo = <Recepcionista pagina="home" />
    else if (pagina === 'visitantes') conteudo = <Recepcionista pagina="visitantes" />
    else if (pagina === 'agenda') conteudo = <Recepcionista pagina="agenda" />
    else if (pagina === 'cadastrados') conteudo = <VisitantesCadastrados />
    else if (pagina === 'agendar') conteudo = <AgendamentosGestor modoInicial="novo" podeAgendar />
    else if (pagina === 'agendamentos') conteudo = <AgendamentosGestor modoInicial="lista" podeAgendar />
    else if (pagina === 'setores') conteudo = <SetoresProcurados />
    else if (pagina === 'relatorio') conteudo = <RelatorioDia />
    else if (pagina === 'usuarios') conteudo = <Usuarios />
    else if (pagina === 'convites') conteudo = <EnviarConvites />
    else conteudo = <PainelGestor onNav={setPagina} />
  }

  return (
    <Shell menus={menus} pagina={pagina} onNav={setPagina}>
      {conteudo}
    </Shell>
  )
}

export default function App() {
  if (!supabaseConfigured) {
    return <ConfiguracaoPendente />
  }

  return (
    <AuthProvider>
      <AppInterno />
    </AuthProvider>
  )
}
