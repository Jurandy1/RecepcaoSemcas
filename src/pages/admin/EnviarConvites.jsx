import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  History,
  Link2,
  MailPlus,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { PAPEIS, PAPEIS_CONVITE } from '../../lib/theme'
import { Alert, Btn, Chip, Empty, Field, Input, Select } from '../../components/ui'

function linkConvite(token) {
  const base = window.location.origin
  return `${base}/?convite=${encodeURIComponent(token)}`
}

const STATUS_CONVITE = {
  aceito: { tone: 'success', icon: CheckCircle2, label: 'Cadastro concluído' },
  pendente: { tone: 'warn', icon: Clock, label: 'Convite pendente' },
  cancelado: { tone: 'gray', icon: XCircle, label: 'Convite cancelado' },
}

export default function EnviarConvites() {
  const { perfil } = useAuth()
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState('recepcionista')
  const [lista, setLista] = useState([])
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [ultimoLink, setUltimoLink] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const { data, error } = await supabase
      .from('convites')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(50)

    if (error) {
      if (/convites|schema cache/i.test(error.message || '')) {
        setErro('Tabela de convites não existe ainda. No Supabase → SQL Editor, rode o arquivo supabase/criar-convites.sql e tente de novo.')
      } else {
        setErro(error.message)
      }
      setLista([])
      return
    }
    setErro('')
    setLista(data || [])
  }

  useEffect(() => {
    carregar()
  }, [])

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setMsg('')
    setUltimoLink('')

    if (!email.trim()) {
      setErro('Informe o e-mail.')
      return
    }

    setSalvando(true)
    try {
      const { data, error } = await supabase
        .from('convites')
        .insert({
          email: email.trim().toLowerCase(),
          papel,
          criado_por: perfil.id,
        })
        .select('token')
        .single()

      if (error) {
        if (/convites|schema cache/i.test(error.message || '')) {
          throw new Error('Tabela de convites não existe. Rode supabase/criar-convites.sql no SQL Editor do Supabase.')
        }
        throw error
      }

      const link = linkConvite(data.token)
      setUltimoLink(link)
      setMsg('Convite criado. Copie o link e envie para a pessoa.')
      setEmail('')
      await carregar()
    } catch (err) {
      setErro(err.message || 'Erro ao criar convite.')
    } finally {
      setSalvando(false)
    }
  }

  async function copiar(texto, label = 'Link') {
    try {
      await navigator.clipboard.writeText(texto)
      setMsg(`${label} copiado.`)
    } catch {
      setMsg('Selecione e copie manualmente.')
    }
  }

  async function cancelar(c) {
    if (!confirm(`Cancelar o convite de ${c.email}?`)) return
    await supabase.from('convites').update({ status: 'cancelado' }).eq('id', c.id)
    await carregar()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="page-title text-2xl sm:text-3xl">Enviar convites</h1>
        <p className="page-sub text-sm text-gray-20 mt-1.5">
          Gere um link e envie para a pessoa se cadastrar. Em <strong>Convites recentes</strong> você
          confere se ela já concluiu.
        </p>
      </div>

      {erro && (
        <Alert type="error" icon={AlertTriangle}>
          {erro}
        </Alert>
      )}
      {msg && (
        <Alert type="success" icon={CheckCircle2}>
          {msg}
        </Alert>
      )}

      <div className="card shadow-e2">
        <div className="p-5 sm:p-6">
          <form onSubmit={enviar} className="space-y-4">
            <Field label="E-mail da pessoa" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </Field>
            <Field label="Tipo de acesso" required>
              <Select value={papel} onChange={(e) => setPapel(e.target.value)}>
                {PAPEIS_CONVITE.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <button type="submit" className="btn btn-primary btn-md" disabled={salvando}>
              <MailPlus size={16} />
              {salvando ? 'Gerando...' : 'Gerar link de convite'}
            </button>
          </form>

          {ultimoLink && (
            <div className="mt-5 border border-blue-20 bg-blue-10 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-blue-20/50 text-xs font-semibold uppercase tracking-wider text-blue-dark flex items-center gap-2">
                <CheckCircle2 size={14} />
                Link gerado — copie e envie
              </div>
              <div className="p-4 flex flex-col sm:flex-row items-start gap-3">
                <code className="flex-1 text-xs sm:text-sm break-all font-mono text-blue-dark">
                  {ultimoLink}
                </code>
                <Btn
                  size="sm"
                  variant="secondary"
                  icon={Copy}
                  onClick={() => copiar(ultimoLink)}
                  className="flex-shrink-0"
                >
                  Copiar
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-3 border-b border-gray-2 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-blue-dark flex items-center gap-2">
            <History size={16} />
            Convites recentes
          </h2>
          <Btn variant="ghost" size="xs" icon={RefreshCw} onClick={carregar} aria-label="Atualizar lista" />
        </div>
        {lista.length === 0 ? (
          <Empty icon={MailPlus}>Nenhum convite gerado ainda.</Empty>
        ) : (
          <div className="divide-y divide-gray-2">
            {lista.map((c) => {
              const st = STATUS_CONVITE[c.status] || STATUS_CONVITE.pendente
              return (
                <div
                  key={c.id}
                  className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-blue-dark truncate">{c.email}</div>
                    <div className="text-xs mt-1 flex flex-wrap items-center gap-2 text-gray-20">
                      <Chip tone="outline" xs>
                        {PAPEIS[c.papel] || c.papel}
                      </Chip>
                      <Chip tone={st.tone} icon={st.icon} xs>
                        {st.label}
                      </Chip>
                      <span>
                        {new Date(c.aceito_em || c.criado_em).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  {c.status === 'pendente' && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Btn
                        variant="outline"
                        size="xs"
                        icon={Link2}
                        onClick={() => copiar(linkConvite(c.token))}
                      >
                        Copiar link
                      </Btn>
                      <Btn variant="dangerGhost" size="xs" onClick={() => cancelar(c)}>
                        Cancelar convite
                      </Btn>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
