import { useMemo, useState } from 'react'
import {
  Home, UserPlus, Calendar, Users, Mail, ClipboardList, FileText, Building2
} from 'lucide-react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { C } from './lib/theme'
import Shell from './components/Shell'
import Login from './pages/Login'
import AceitarConvite from './pages/AceitarConvite'
import Recepcionista from './pages/Recepcionista'
import Setor from './pages/Setor'
import EnviarConvites from './pages/EnviarConvites'
import RelatorioDia from './pages/RelatorioDia'
import Servidores from './pages/Servidores'
import {
  PainelGestor,
  Usuarios,
  VisitantesGestor,
  AgendamentosGestor,
} from './pages/Gestor'

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
      { id: 'visitantes', label: 'Visitantes', icon: ClipboardList },
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
  return [
    { id: 'home', label: 'Painel', icon: Home },
    { id: 'registrar', label: 'Registrar visitante', icon: UserPlus },
    { id: 'visitantes', label: 'Visitantes', icon: ClipboardList },
    { id: 'agendamentos', label: 'Agendamentos', icon: Calendar },
    { id: 'relatorio', label: 'Relatório do dia', icon: FileText },
    { id: 'servidores', label: 'Servidores', icon: Building2 },
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'convites', label: 'Enviar convites', icon: Mail },
  ]
}

function AppInterno() {
  const { loading, isLoggedIn, perfil, logout } = useAuth()
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
    return <Login onIrAceitar={() => setTelaPublica('aceitar')} />
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
  const irParaVisitantes = () => setPagina('visitantes')

  let conteudo = null
  if (perfil.papel === 'recepcionista') {
    if (pagina === 'relatorio') conteudo = <RelatorioDia />
    else conteudo = <Recepcionista pagina={pagina} onRegistrado={irParaVisitantes} />
  } else if (perfil.papel === 'setor') {
    conteudo = <Setor pagina={pagina} />
  } else if (ehGestor) {
    if (pagina === 'registrar') conteudo = <Recepcionista pagina="home" onRegistrado={irParaVisitantes} />
    else if (pagina === 'visitantes') conteudo = <Recepcionista pagina="visitantes" />
    else if (pagina === 'agendamentos') conteudo = <AgendamentosGestor />
    else if (pagina === 'relatorio') conteudo = <RelatorioDia />
    else if (pagina === 'servidores') conteudo = <Servidores />
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
  return (
    <AuthProvider>
      <AppInterno />
    </AuthProvider>
  )
}
