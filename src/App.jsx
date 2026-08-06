import { useState } from 'react'
import {
  Home, UserPlus, Calendar, Users, Mail, ClipboardList
} from 'lucide-react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { C } from './lib/theme'
import Shell from './components/Shell'
import Login from './pages/Login'
import AceitarConvite from './pages/AceitarConvite'
import Recepcionista from './pages/Recepcionista'
import Setor from './pages/Setor'
import EnviarConvites from './pages/EnviarConvites'
import {
  PainelGestor,
  Usuarios,
  VisitantesGestor,
  AgendamentosGestor,
} from './pages/Gestor'

function menusPorPapel(papel) {
  if (papel === 'recepcionista') {
    return [
      { id: 'home', label: 'Registrar', icon: UserPlus },
      { id: 'agenda', label: 'Agenda do dia', icon: Calendar },
    ]
  }
  if (papel === 'setor') {
    return [
      { id: 'home', label: 'Meus agendamentos', icon: Home },
      { id: 'novo', label: 'Novo agendamento', icon: UserPlus },
    ]
  }
  // admin e coordenadora
  return [
    { id: 'home', label: 'Painel', icon: Home },
    { id: 'visitantes', label: 'Visitantes', icon: ClipboardList },
    { id: 'agendamentos', label: 'Agendamentos', icon: Calendar },
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'convites', label: 'Enviar convites', icon: Mail },
  ]
}

function AppInterno() {
  const { loading, isLoggedIn, perfil, logout } = useAuth()
  const [telaPublica, setTelaPublica] = useState('login') // login | aceitar
  const [pagina, setPagina] = useState('home')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.gray1, color: C.gray60 }}>
        Carregando...
      </div>
    )
  }

  if (!isLoggedIn) {
    if (telaPublica === 'aceitar') {
      return <AceitarConvite onVoltar={() => setTelaPublica('login')} />
    }
    return <Login onIrAceitar={() => setTelaPublica('aceitar')} />
  }

  // Logado sem perfil (convite incompleto)
  if (!perfil) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ backgroundColor: C.gray1 }}>
        <p className="text-center" style={{ color: C.gray80 }}>
          Sua conta ainda não tem perfil no sistema.<br />
          Use a tela de Aceitar convite com o código recebido.
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

  let conteudo = null
  if (perfil.papel === 'recepcionista') {
    conteudo = <Recepcionista pagina={pagina} />
  } else if (perfil.papel === 'setor') {
    conteudo = <Setor pagina={pagina} />
  } else {
    if (pagina === 'visitantes') conteudo = <VisitantesGestor />
    else if (pagina === 'agendamentos') conteudo = <AgendamentosGestor />
    else if (pagina === 'usuarios') conteudo = <Usuarios />
    else if (pagina === 'convites') conteudo = <EnviarConvites />
    else conteudo = <PainelGestor />
  }

  return (
    <Shell
      menus={menus}
      pagina={pagina}
      onNav={setPagina}
    >
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
