import { useState } from 'react'
import { Eye, EyeOff, ChevronRight } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { C } from '../lib/theme'
import { Logo, Btn, Field, Input, Alert, Creditos } from '../components/ui'

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
        setErro('Conta sem perfil. Se você recebeu um convite, use "Aceitar convite".')
      }
    } catch (err) {
      setErro(err.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : (err.message || 'Não foi possível entrar.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.gray1 }}>
      <header className="bg-white border-b" style={{ borderColor: C.gray3 }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Logo size={48} />
          <div>
            <div className="text-xs font-semibold tracking-wide uppercase" style={{ color: C.gray60 }}>
              Secretaria Municipal da Criança e Assistência Social
            </div>
            <div className="text-lg font-bold" style={{ color: C.blueDark }}>SEMCAS</div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-1" style={{ color: C.blueDark }}>
            Controle de Atendimento
          </h1>
          <p className="text-sm mb-6" style={{ color: C.gray60 }}>
            Entre com seu e-mail e senha.
          </p>

          <form onSubmit={handleSubmit} className="bg-white border p-8 space-y-5" style={{ borderColor: C.gray3 }}>
            {erro && <Alert type="error">{erro}</Alert>}

            <Field label="E-mail" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
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
              className="text-sm font-semibold underline"
              style={{ color: C.blue }}
            >
              Recebi um convite — quero me cadastrar
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t py-5 px-6" style={{ backgroundColor: C.white, borderColor: C.gray3 }}>
        <div className="max-w-5xl mx-auto flex justify-between text-xs" style={{ color: C.gray60 }}>
          <Creditos />
          <span>SEMCAS · Controle de Atendimento</span>
        </div>
      </footer>
    </div>
  )
}
