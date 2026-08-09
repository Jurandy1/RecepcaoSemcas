import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { PAPEIS } from '../../lib/theme'
import { Alert, Btn, Creditos, Field, Input } from '../../components/ui'
import { CampoSetorProcurado, useSetoresDisponiveis } from '../../components/setores'

export default function AceitarConvite({ onVoltar, tokenInicial = '' }) {
  const { refreshPerfil } = useAuth()
  const { setores } = useSetoresDisponiveis()
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
    const setorEscolhido = form.setor.trim()
    if (convite.papel === 'setor') {
      if (!setorEscolhido) {
        setErro('Para acesso de Setor (agendamento), o nome do setor é obrigatório.')
        return
      }
      if (setorEscolhido.length < 2) {
        setErro('Informe o nome completo do setor.')
        return
      }
      const { data: livre, error: erroCheck } = await supabase.rpc('setor_disponivel', {
        p_setor: setorEscolhido,
      })
      if (!erroCheck && livre === false) {
        setErro(
          `O setor "${setorEscolhido}" já está reservado para outro usuário. Escolha outro setor ou fale com a administração.`
        )
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
        p_setor: convite.papel === 'setor' ? setorEscolhido : null,
      })

      if (rpcError) {
        // A conta de acesso já existe mas ficou sem perfil: encerra a sessão
        // para a pessoa poder corrigir e tentar de novo com a mesma senha.
        await supabase.auth.signOut()
        throw rpcError
      }

      await refreshPerfil()
      setOk(true)
    } catch (err) {
      setErro(err.message || 'Não foi possível concluir o cadastro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="border-b border-gray-3 bg-white shadow-e1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-[0.24em] uppercase text-gray-20">
              Recepção Semcas
            </div>
            <div className="text-sm font-bold text-blue-dark truncate mt-0.5">Aceitar convite</div>
          </div>
          <Btn variant="ghost" size="sm" icon={ArrowLeft} onClick={onVoltar} className="flex-shrink-0">
            <span className="hidden sm:inline">Voltar ao login</span>
          </Btn>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-lg mx-auto">
          <div className="mb-6">
            <h1 className="page-title text-2xl sm:text-3xl">Concluir seu cadastro</h1>
            <p className="page-sub text-sm text-gray-20 mt-2">
              Valide o código do convite e defina sua senha.
            </p>
          </div>

          <div className="card shadow-e2">
            <div className="card-topbar" />
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
              {erro && <Alert type="error" icon={AlertTriangle}>{erro}</Alert>}
              {ok && (
                <Alert type="success" icon={CheckCircle2}>
                  Cadastro concluído. Você já pode usar o sistema.
                </Alert>
              )}

              <Field
                label="Código do convite"
                required
                hint="Código enviado pelo administrador via WhatsApp ou e-mail."
              >
                <div className="flex gap-2">
                  <Input
                    value={form.token}
                    onChange={(e) => set('token', e.target.value)}
                    placeholder="Cole aqui o código recebido"
                    large
                  />
                  <Btn
                    variant="secondary"
                    size="lg"
                    onClick={() => validarToken()}
                    disabled={validando}
                    className="flex-shrink-0"
                  >
                    {validando ? '...' : 'Validar'}
                  </Btn>
                </div>
              </Field>

              {convite && (
                <Alert type="success" icon={CheckCircle2} title="Convite validado">
                  Papel: <strong>{PAPEIS[convite.papel] || convite.papel}</strong> · {convite.email}
                </Alert>
              )}

              <Field label="Seu nome completo" required>
                <Input value={form.nome} onChange={(e) => set('nome', e.target.value)} large required />
              </Field>

              <Field label="E-mail" required hint="Deve ser o mesmo e-mail do convite.">
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
                <div className="space-y-2">
                  <Field
                    label="Seu setor"
                    required
                    hint="Escolha um setor da lista ou use Outro para digitar o nome do seu setor."
                  >
                    <CampoSetorProcurado
                      value={form.setor}
                      onChange={(v) => set('setor', v)}
                      setores={setores}
                      placeholder="Digite o nome do seu setor"
                      large
                    />
                  </Field>
                  <Alert type="warn" icon={AlertTriangle} title="A escolha é definitiva">
                    O setor fica reservado para você e não pode ser trocado depois. Todos os
                    agendamentos que você criar vão para ele, e só você e a administração podem
                    agendar nesse setor. A lista mostra apenas os setores que ainda estão livres.
                  </Alert>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading || ok}
              >
                <CheckCircle2 size={20} />
                {loading ? 'Salvando...' : 'Concluir cadastro'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-3 py-4 px-6 text-center text-xs text-gray-20">
        <Creditos />
      </footer>
    </div>
  )
}
