import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, PAPEIS } from '../lib/theme'
import { Btn, Field, Input, Alert, Creditos } from '../components/ui'
import { CampoSetorProcurado, useSetoresAtivos } from './SetoresProcurados'

export default function AceitarConvite({ onVoltar, tokenInicial = '' }) {
  const { refreshPerfil } = useAuth()
  const { setores } = useSetoresAtivos()
  const [form, setForm] = useState({
    token: tokenInicial || '',
    nome: '',
    email: '',
    senha: '',
    confirmar: '',
    setor: '',
  })
  const [convite, setConvite] = useState(null)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validando, setValidando] = useState(false)

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function validarToken(tokenOverride) {
    const token = (tokenOverride ?? form.token).trim()
    setErro('')
    setConvite(null)
    if (!token) {
      setErro('Informe o código do convite.')
      return
    }
    setValidando(true)
    try {
      const { data, error } = await supabase
        .from('convites')
        .select('email, papel, status, expira_em')
        .eq('token', token)
        .eq('status', 'pendente')
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setErro('Convite não encontrado, já usado ou expirado.')
        return
      }
      setConvite(data)
      set('email', data.email)
      if (tokenOverride) set('token', token)
    } catch (err) {
      setErro(err.message || 'Erro ao validar convite.')
    } finally {
      setValidando(false)
    }
  }

  useEffect(() => {
    if (tokenInicial) validarToken(tokenInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenInicial])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setOk(false)

    if (!convite) {
      setErro('Valide o código do convite primeiro.')
      return
    }
    if (form.senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (form.senha !== form.confirmar) {
      setErro('As senhas não coincidem.')
      return
    }
    if (convite.papel === 'setor') {
      if (!form.setor.trim()) {
        setErro('Para acesso de Setor (agendamento), o nome do setor é obrigatório.')
        return
      }
      if (form.setor.trim().length < 2) {
        setErro('Informe o nome completo do setor.')
        return
      }
    }

    setLoading(true)
    try {
      const email = form.email.trim().toLowerCase()

      const { data: signData, error: signError } = await supabase.auth.signUp({
        email,
        password: form.senha,
      })

      if (signError) {
        const jaExiste = /already|registered|exists/i.test(signError.message || '')
        if (jaExiste) {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password: form.senha,
          })
          if (loginError) {
            throw new Error('Este e-mail já existe. Use a senha correta ou peça um novo convite.')
          }
        } else {
          throw signError
        }
      } else if (!signData.session) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password: form.senha,
        })
        if (loginError) {
          throw new Error(
            'Conta criada, mas o login falhou. Se o Supabase exigir confirmação de e-mail, desative em Authentication → Providers → Email → Confirm email.'
          )
        }
      }

      const { error: rpcError } = await supabase.rpc('aceitar_convite', {
        p_token: form.token.trim(),
        p_nome: form.nome.trim(),
        p_setor: convite.papel === 'setor' ? form.setor.trim() : null,
      })

      if (rpcError) throw rpcError

      await refreshPerfil()
      setOk(true)
    } catch (err) {
      setErro(err.message || 'Não foi possível concluir o cadastro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.gray1 }}>
      <header className="border-b" style={{ borderColor: C.gray3, backgroundColor: C.header }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold" style={{ color: C.blueDark }}>Aceitar convite</div>
            <div className="text-xs" style={{ color: C.gray60 }}>SEMCAS · Cadastro de acesso</div>
          </div>
          <button onClick={onVoltar} className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: C.blue }}>
            <ArrowLeft size={16} /> Voltar ao login
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-lg border p-8 space-y-5 shadow-sm" style={{ borderColor: C.gray3, backgroundColor: C.card }}>
          {erro && <Alert type="error">{erro}</Alert>}
          {ok && (
            <Alert type="success">
              Cadastro concluído. Você já pode usar o sistema.
            </Alert>
          )}

          <Field label="Código do convite" required hint="Código enviado pelo administrador">
            <div className="flex gap-2">
              <Input
                value={form.token}
                onChange={(e) => set('token', e.target.value)}
                placeholder="Cole o código aqui"
                large
              />
              <Btn type="button" variant="secondary" size="lg" onClick={validarToken} disabled={validando}>
                {validando ? '...' : 'Validar'}
              </Btn>
            </div>
          </Field>

          {convite && (
            <Alert type="info">
              Convite para <strong>{PAPEIS[convite.papel] || convite.papel}</strong> · e-mail: <strong>{convite.email}</strong>
            </Alert>
          )}

          <Field label="Seu nome completo" required>
            <Input value={form.nome} onChange={(e) => set('nome', e.target.value)} large required />
          </Field>

          <Field label="E-mail" required hint="Deve ser o mesmo e-mail do convite">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              large
              required
              readOnly={!!convite}
            />
          </Field>

          {convite?.papel === 'setor' && (
            <Field
              label="Nome do seu setor"
              required
              hint="Obrigatório. Todos os agendamentos que você criar ficarão vinculados a este setor."
            >
              <CampoSetorProcurado
                value={form.setor}
                onChange={(v) => set('setor', v)}
                setores={setores}
                large
              />
            </Field>
          )}

          <Field label="Criar senha" required>
            <Input
              type="password"
              value={form.senha}
              onChange={(e) => set('senha', e.target.value)}
              placeholder="Mínimo 6 caracteres"
              large
              required
            />
          </Field>

          <Field label="Confirmar senha" required>
            <Input
              type="password"
              value={form.confirmar}
              onChange={(e) => set('confirmar', e.target.value)}
              large
              required
            />
          </Field>

          <Btn type="submit" full size="lg" icon={CheckCircle2} disabled={loading || ok}>
            {loading ? 'Salvando...' : 'Concluir cadastro'}
          </Btn>
        </form>
      </main>

      <footer className="border-t py-4 px-6 text-center text-xs" style={{ color: C.gray60, borderColor: C.gray3 }}>
        <Creditos />
      </footer>
    </div>
  )
}
