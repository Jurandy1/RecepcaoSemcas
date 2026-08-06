import { useEffect, useState } from 'react'
import { Send, Copy, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, PAPEIS, PAPEIS_CONVITE } from '../lib/theme'
import { Btn, Field, Input, Select, Card, Alert, Empty } from '../components/ui'

export default function EnviarConvites() {
  const { perfil } = useAuth()
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState('recepcionista')
  const [lista, setLista] = useState([])
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [ultimoToken, setUltimoToken] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const { data, error } = await supabase
      .from('convites')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(50)
    if (error) setErro(error.message)
    setLista(data || [])
  }

  useEffect(() => {
    carregar()
  }, [])

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setMsg('')
    setUltimoToken('')

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

      if (error) throw error

      setUltimoToken(data.token)
      setMsg('Convite criado. Copie o código e envie para a pessoa.')
      setEmail('')
      await carregar()
    } catch (err) {
      setErro(err.message || 'Erro ao criar convite.')
    } finally {
      setSalvando(false)
    }
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto)
      setMsg('Código copiado.')
    } catch {
      setMsg('Selecione e copie o código manualmente.')
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
          Crie um convite e envie o código para a pessoa se cadastrar em “Aceitar convite”.
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
            {salvando ? 'Criando...' : 'Gerar convite'}
          </Btn>
        </form>

        {ultimoToken && (
          <div className="mt-5 p-4 border" style={{ borderColor: C.blue, backgroundColor: C.blueBg }}>
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: C.blue }}>Código do convite</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm break-all font-mono" style={{ color: C.blueDark }}>{ultimoToken}</code>
              <Btn type="button" size="sm" variant="secondary" icon={Copy} onClick={() => copiar(ultimoToken)}>
                Copiar
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
              <div>
                <div className="font-semibold text-sm" style={{ color: C.blueDark }}>{c.email}</div>
                <div className="text-xs" style={{ color: C.gray60 }}>
                  {PAPEIS[c.papel]} · {c.status}
                  {c.status === 'pendente' && (
                    <> · código: <button className="underline font-mono" onClick={() => copiar(c.token)}>{c.token.slice(0, 8)}...</button></>
                  )}
                </div>
              </div>
              {c.status === 'pendente' && (
                <Btn variant="ghost" size="sm" onClick={() => cancelar(c.id)}>Cancelar</Btn>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
