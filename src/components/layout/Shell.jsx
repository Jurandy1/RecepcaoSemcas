import { useEffect, useState } from 'react'
import { ChevronRight, Clock, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { PAPEIS, WHATSAPP_DEV } from '../../lib/theme'
import { Avatar, IconeWhatsapp } from '../ui'

function useRelogio() {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30000)
    return () => clearInterval(id)
  }, [])
  return agora.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * menus: lista com { grupo } para separadores e { id, label, icon } para itens.
 */
export default function Shell({ menus, pagina, onNav, children }) {
  const { perfil, logout } = useAuth()
  const [drawerAberto, setDrawerAberto] = useState(false)
  const relogio = useRelogio()

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setDrawerAberto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const itens = menus.filter((m) => m.id)
  const atual = itens.find((m) => m.id === pagina) || itens[0]
  const secao = (() => {
    let grupo = ''
    for (const m of menus) {
      if (m.grupo) grupo = m.grupo
      if (m.id === pagina) return grupo
    }
    return grupo
  })()

  const papel = PAPEIS[perfil?.papel] || perfil?.papel || ''

  function navegar(id) {
    onNav(id)
    setDrawerAberto(false)
  }

  return (
    <div className="min-h-screen bg-canvas">
      {drawerAberto && (
        <div
          className="drawer-backdrop lg:hidden"
          onClick={() => setDrawerAberto(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex min-h-screen">
        <aside
          className={`fixed lg:sticky top-0 left-0 z-50 w-72 lg:w-60 h-screen flex-shrink-0 flex flex-col bg-sidebar shadow-e3 lg:shadow-none transition-transform duration-200 lg:translate-x-0 ${
            drawerAberto ? 'translate-x-0 drawer-open' : '-translate-x-full'
          }`}
          aria-label="Menu principal"
        >
          <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
            <div className="min-w-0">
              <div className="text-[10px] font-bold tracking-[0.24em] uppercase text-yellow/90 leading-none">
                Sistema institucional
              </div>
              <div className="font-display text-base font-bold text-white mt-1 truncate">
                Recepção Semcas
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDrawerAberto(false)}
              className="lg:hidden ml-auto p-2 text-white/70 hover:text-white flex-shrink-0"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2" aria-label="Navegação">
            {menus.map((item, i) => {
              if (item.grupo) {
                return (
                  <div key={`g-${item.grupo}-${i}`} className="nav-group">
                    {item.grupo}
                  </div>
                )
              }
              const Icon = item.icon
              const ativo = pagina === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navegar(item.id)}
                  className="nav-item"
                  data-active={ativo}
                  aria-current={ativo ? 'page' : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </nav>

          <a
            href={WHATSAPP_DEV}
            target="_blank"
            rel="noopener noreferrer"
            className="border-t border-white/10 px-4 py-3 text-[10px] leading-relaxed text-white/60 hover:text-white hover:bg-white/5 transition-colors block"
          >
            Desenvolvido por
            <br />
            <strong className="text-white/95 text-xs inline-flex items-center gap-1">
              Jurandy Santana
              <IconeWhatsapp size={11} />
            </strong>
          </a>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-gray-3 sticky top-0 z-30 shadow-e1">
            <div className="px-3 sm:px-6 py-2.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerAberto(true)}
                className="lg:hidden p-2 text-blue-dark hover:bg-canvas rounded flex-shrink-0"
                aria-label="Abrir menu"
              >
                <Menu size={24} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-20 uppercase tracking-wider font-semibold">
                  {secao && (
                    <>
                      <span>{secao}</span>
                      <ChevronRight size={12} />
                    </>
                  )}
                  <span className="text-blue-dark truncate">{atual?.label}</span>
                </div>
                <div className="text-sm font-semibold text-blue-dark sm:hidden truncate">
                  {atual?.label}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-canvas rounded text-xs text-gray-60 flex-shrink-0">
                <Clock size={14} />
                <span className="font-mono font-semibold">{relogio}</span>
              </div>

              <div className="flex items-center gap-2 pl-3 border-l border-gray-2 flex-shrink-0">
                <Avatar nome={perfil?.nome || ''} size={36} />
                <div className="hidden sm:block text-right leading-tight min-w-0">
                  <div className="text-sm font-semibold text-blue-dark truncate">{perfil?.nome}</div>
                  <div className="text-xs text-gray-20 truncate">
                    {papel}
                    {perfil?.setor ? ` · ${perfil.setor}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-20 hover:text-danger hover:bg-danger-bg rounded"
                  title="Sair do sistema"
                >
                  <LogOut size={16} />
                  Sair
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="md:hidden p-2 text-gray-20 hover:text-danger hover:bg-danger-bg rounded"
                  aria-label="Sair do sistema"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
