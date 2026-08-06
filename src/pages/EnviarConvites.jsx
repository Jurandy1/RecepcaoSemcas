import { useEffect, useState } from 'react'
import { Send, Copy, RefreshCw, Link2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, PAPEIS, PAPEIS_CONVITE } from '../lib/theme'
import { Btn, Field, Input, Select, Card, Alert, Empty } from '../components/ui'

function linkConvite(token) {
  const base = window.location.origin
  return `${base}/?convite=${encodeURIComponent(token)}`
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

  async function cancelar(id) {
    await supabase.from('convites').update({ status: 'cancelado' }).eq('id', id)
    await carregar()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Enviar convites</h1>
        <p className="text-sm mt-1" style={{ color: C.gray60 }}>
          Gere um link e envie para a pessoa se cadastrar no sistema.
        </p>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <Card className="p-6">
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
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
          </Field>
          <Btn type="submit" icon={Send} disabled={salvando}>
            {salvando ? 'Gerando...' : 'Gerar link de convite'}
          </Btn>
        </form>

        {ultimoLink && (
          <div className="mt-5 p-4 border" style={{ borderColor: C.blue, backgroundColor: C.blueBg }}>
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: C.blue }}>Link do convite</div>
            <div className="flex items-start gap-2">
              <code className="flex-1 text-sm break-all font-mono" style={{ color: C.blueDark }}>{ultimoLink}</code>
              <Btn type="button" size="sm" variant="secondary" icon={Copy} onClick={() => copiar(ultimoLink)}>
                Copiar link
              </Btn>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: C.gray3 }}>
          <h2 className="font-bold" style={{ color: C.blueDark }}>Convites recentes</h2>
          <Btn variant="ghost" size="sm" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
        </div>
        {lista.length === 0 ? (
          <Empty>Nenhum convite ainda.</Empty>
        ) : (
          lista.map((c) => (
            <div key={c.id} className="px-5 py-3 border-t flex flex-col sm:flex-row sm:items-center gap-2 justify-between" style={{ borderColor: C.gray3 }}>
              <div className="min-w-0">
                <div className="font-semibold text-sm" style={{ color: C.blueDark }}>{c.email}</div>
                <div className="text-xs" style={{ color: C.gray60 }}>
                  {PAPEIS[c.papel]} · {c.status}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.status === 'pendente' && (
                  <>
                    <Btn
                      variant="secondary"
                      size="sm"
                      icon={Link2}
                      onClick={() => copiar(linkConvite(c.token))}
                    >
                      Copiar link
                    </Btn>
                    <Btn variant="ghost" size="sm" onClick={() => cancelar(c.id)}>Cancelar</Btn>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
