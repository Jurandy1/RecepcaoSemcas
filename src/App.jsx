import { useMemo, useState } from 'react'
import {
  Home, UserPlus, Calendar, Users, Mail, ClipboardList, FileText, ContactRound, Building2, CalendarPlus
} from 'lucide-react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { supabaseConfigured } from './lib/supabase'
import { C } from './lib/theme'
import Shell from './components/Shell'
import Login from './pages/Login'
import AceitarConvite from './pages/AceitarConvite'
import Recepcionista from './pages/Recepcionista'
import Setor from './pages/Setor'
import EnviarConvites from './pages/EnviarConvites'
import RelatorioDia from './pages/RelatorioDia'
import VisitantesCadastrados from './pages/VisitantesCadastrados'
import SetoresProcurados from './pages/SetoresProcurados'
import {
  PainelGestor,
  Usuarios,
  AgendamentosGestor,
} from './pages/Gestor'

function ConfiguracaoPendente() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: C.gray1 }}
    >
      <div
        className="w-full max-w-lg border p-8 space-y-4 shadow-sm"
        style={{ backgroundColor: C.card, borderColor: C.gray3 }}
      >
        <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>
          Configuração do Supabase necessária
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: C.gray60 }}>
          O sistema está sem a URL e a chave do banco. Por isso a tela ficava branca.
        </p>
        <ol className="text-sm space-y-2 list-decimal pl-5" style={{ color: C.gray80 }}>
          <li>Abra o arquivo <strong>public/config.js</strong> (ou <strong>dist/config.js</strong> no preview).</li>
          <li>Cole a <strong>Project URL</strong> e a <strong>anon public</strong> key do Supabase.</li>
          <li>Salve e atualize a página (F5).</li>
        </ol>
        <p className="text-xs leading-relaxed" style={{ color: C.gray20 }}>
          No painel: Supabase → Project Settings → API
        </p>
      </div>
    </div>
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
      { id: 'home', label: 'Registrar', icon: UserPlus },
      { id: 'visitantes', label: 'Servidores / Visitantes', icon: ClipboardList },
      { id: 'agendamentos', label: 'Agendamentos', icon: Calendar },
      { id: 'agenda', label: 'Agenda do dia', icon: Calendar },
      { id: 'relatorio', label: 'Relatório do dia', icon: FileText },
    ]
  }
  if (papel === 'setor') {
    return [
      { id: 'home', label: 'Meus agendamentos', icon: Home },
      { id: 'novo', label: 'Novo agendamento', icon: UserPlus },
    ]
  }

  // Admin e coordenadora — Agendar visita só nestes papéis
  const menus = [
    { id: 'home', label: 'Painel', icon: Home },
    { id: 'registrar', label: 'Registrar visitante', icon: UserPlus },
    { id: 'visitantes', label: 'Servidores / Visitantes', icon: ClipboardList },
    { id: 'cadastrados', label: 'Visitantes cadastrados', icon: ContactRound },
    { id: 'agendar', label: 'Agendar visita', icon: CalendarPlus },
    { id: 'agendamentos', label: 'Agendamentos', icon: Calendar },
    { id: 'setores', label: 'Setor procurado', icon: Building2 },
    { id: 'relatorio', label: 'Relatório do dia', icon: FileText },
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'convites', label: 'Enviar convites', icon: Mail },
  ]

  return menus
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.gray1, color: C.gray60 }}>
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
          <div className="fixed top-0 left-0 right-0 z-50 p-3 text-center text-sm font-semibold" style={{ backgroundColor: C.orangeBg, color: C.orange }}>
            Sessão expirada. Faça login de novo.
          </div>
        )}
        <Login onIrAceitar={() => setTelaPublica('aceitar')} />
      </>
    )
  }

  if (!perfil) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ backgroundColor: C.gray1 }}>
        <p className="text-center" style={{ color: C.gray80 }}>
          Sua conta ainda não tem perfil no sistema.<br />
          Use a tela de Aceitar convite com o link recebido.
        </p>
        <button
          className="font-semibold underline"
          style={{ color: C.blue }}
          onClick={() => { logout(); setTelaPublica('aceitar') }}
        >
          Ir para Aceitar convite
        </button>
        <button className="text-sm" style={{ color: C.gray60 }} onClick={logout}>Sair</button>
      </div>
    )
  }

  if (!perfil.ativo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: C.gray1 }}>
        <p style={{ color: C.red }}>Seu acesso está desativado. Fale com a administração.</p>
        <button className="font-semibold" style={{ color: C.blue }} onClick={logout}>Sair</button>
      </div>
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
    else if (pagina === 'cadastrados') conteudo = <VisitantesCadastrados />
    else if (pagina === 'agendar') conteudo = <AgendamentosGestor modoInicial="novo" podeAgendar />
    else if (pagina === 'agendamentos') conteudo = <AgendamentosGestor modoInicial="lista" podeAgendar />
    else if (pagina === 'setores') conteudo = <SetoresProcurados />
    else if (pagina === 'relatorio') conteudo = <RelatorioDia />
    else if (pagina === 'usuarios') conteudo = <Usuarios />
    else if (pagina === 'convites') conteudo = <EnviarConvites />
    else conteudo = <PainelGestor />
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
