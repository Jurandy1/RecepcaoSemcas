import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { Alert, Creditos, Field, Input } from '../../components/ui'

export default function Login({ onIrAceitar }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [show, setShow] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const { perfil } = await login(email, senha)
      if (!perfil) {
        setErro('Login ok, mas o perfil ainda não existe no banco. Rode o SQL fix-admin.sql no Supabase.')
      }
    } catch (err) {
      const m = (err.message || '').toLowerCase()
      if (m.includes('invalid login credentials')) {
        setErro('E-mail ou senha incorretos. No Supabase → Authentication → Users, use “Reset password” se precisar.')
      } else if (m.includes('email not confirmed')) {
        setErro('E-mail não confirmado. Desative “Confirm email” em Authentication → Providers → Email.')
      } else {
        setErro(err.message || 'Não foi possível entrar.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative login-bg flex flex-col">
      <header className="relative z-10 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="text-[11px] font-bold tracking-[0.24em] uppercase text-yellow/90">
            Sistema institucional
          </div>
          <div className="font-display text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
            Recepção Semcas
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="font-display text-3xl sm:text-[2.25rem] font-bold text-white leading-[1.1] tracking-tight">
              Acessar o sistema
            </h1>
            <p className="text-sm text-white/75 mt-2">Entre com seu e-mail e senha para continuar.</p>
          </div>

          <div className="card shadow-e3">
            <div className="card-topbar" />
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
              {erro && <Alert type="error">{erro}</Alert>}

              <Field label="E-mail" required htmlFor="loginEmail">
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-5" />
                  <Input
                    id="loginEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    autoComplete="username"
                    required
                    large
                    style={{ paddingLeft: 44 }}
                  />
                </div>
              </Field>

              <Field label="Senha" required htmlFor="loginSenha">
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-5" />
                  <Input
                    id="loginSenha"
                    type={show ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    required
                    large
                    style={{ paddingLeft: 44, paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-20 hover:text-blue-dark"
                    aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </Field>

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
                <ArrowRight size={20} />
              </button>

              <div className="or-divider">Ou</div>

              <button type="button" onClick={onIrAceitar} className="btn btn-outline btn-md w-full">
                <KeyRound size={16} />
                Recebi um convite — cadastrar acesso
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-white/65 mt-5 leading-relaxed">
            Uso restrito a servidores autorizados.
            <br />
            As ações neste sistema ficam registradas.
          </p>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between gap-2 text-xs text-white/70">
          <Creditos tone="dark" />
          <span className="text-white/60">Uso restrito · registros auditados</span>
        </div>
      </footer>
    </div>
  )
}
