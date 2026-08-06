import { LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { C, PAPEIS } from '../lib/theme'

export default function Shell({ menus, pagina, onNav, children }) {
  const { perfil, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.gray1 }}>
      <header
        className="border-b sticky top-0 z-30"
        style={{ borderColor: C.gray3, backgroundColor: C.header }}
      >
        <div className="px-4 sm:px-6 py-3 flex items-center gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: C.gray20 }}>
              SEMCAS
            </div>
            <div className="text-sm font-bold truncate" style={{ color: C.blueDark }}>
              Controle de Recepção
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3 pl-4 border-l" style={{ borderColor: C.gray3 }}>
            <div
              className="w-9 h-9 flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: C.blue }}
            >
              {(perfil?.nome || '?').split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold" style={{ color: C.blueDark }}>{perfil?.nome}</div>
              <div className="text-xs" style={{ color: C.gray60 }}>
                {PAPEIS[perfil?.papel] || perfil?.papel}
                {perfil?.setor ? ` · ${perfil.setor}` : ''}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded hover:bg-black/5"
              style={{ color: C.gray60 }}
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside
          className="w-52 sm:w-56 flex-shrink-0 flex flex-col"
          style={{ backgroundColor: C.sidebar }}
        >
          <nav className="flex-1 py-3">
            {menus.map((item) => {
              const Icon = item.icon
              const active = pagina === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm relative transition-colors"
                  style={{
                    color: active ? '#FFFFFF' : 'rgba(255,255,255,0.82)',
                    backgroundColor: active ? C.sidebarActive : 'transparent',
                    fontWeight: active ? 600 : 500,
                    fontSize: perfil?.papel === 'recepcionista' ? 15 : 14,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = C.sidebarHover
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: '#90CAF9' }}
                    />
                  )}
                  <Icon size={18} />
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div
            className="border-t p-4 text-[10px]"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)' }}
          >
            Desenvolvido por <strong style={{ color: '#FFFFFF' }}>Jurandy Santana</strong>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
