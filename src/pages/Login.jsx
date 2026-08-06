import { useState } from 'react'
import { Eye, EyeOff, ChevronRight } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { C } from '../lib/theme'
import { Btn, Field, Input, Alert } from '../components/ui'

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
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: 'url(/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(11, 58, 110, 0.72)' }} />

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="border-b" style={{ borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Secretaria Municipal da Criança e Assistência Social
            </div>
            <div className="text-lg font-bold text-white">SEMCAS · Controle de Atendimento</div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-6 text-white">
              <h1 className="text-2xl font-bold mb-1">Entrar no sistema</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Use seu e-mail e senha.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="border p-8 space-y-5 shadow-lg"
              style={{ borderColor: C.gray3, backgroundColor: 'rgba(255,255,255,0.97)' }}
            >
              {erro && <Alert type="error">{erro}</Alert>}

              <Field label="E-mail" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="semcas@gmail.com"
                  autoComplete="username"
                  required
                  large
                />
              </Field>

              <Field label="Senha" required>
                <div className="relative">
                  <Input
                    type={show ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    required
                    large
                    style={{ paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: C.gray20 }}
                  >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </Field>

              <Btn type="submit" full size="lg" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'} <ChevronRight size={18} />
              </Btn>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onIrAceitar}
                className="text-sm font-semibold underline text-white"
              >
                Recebi um convite — quero me cadastrar
              </button>
            </div>
          </div>
        </main>

        <footer className="py-5 px-6" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
          <div className="max-w-5xl mx-auto flex justify-between text-xs text-white/85">
            <span>Desenvolvido por <strong className="text-white">Jurandy Santana</strong></span>
            <span>SEMCAS · Controle de Atendimento</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
