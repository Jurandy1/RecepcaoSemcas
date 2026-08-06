import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C } from '../lib/theme'
import { maskCpf, maskTelefoneBr, cpfValido, telefoneBrValido, formatCpf } from '../lib/br'
import { Btn, Field, Input, Textarea, Card, Alert, Empty } from '../components/ui'
import Paginacao, { usePaginacao } from '../components/Paginacao'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Setor({ pagina }) {
  const { perfil } = useAuth()
  const [lista, setLista] = useState([])
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome_visitante: '',
    cpf: '',
    telefone: '',
    data: hojeISO(),
    hora: '',
    sala: '',
    observacao: '',
  })
  const { pagina: pag, totalPaginas, itens, irPara, reset } = usePaginacao(lista, 10)

  async function carregar() {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('setor', perfil.setor)
      .gte('data', hojeISO())
      .order('data', { ascending: true })
      .order('hora', { ascending: true })

    if (error) setErro(error.message)
    setLista(data || [])
    reset()
  }

  useEffect(() => {
    if (perfil?.setor) carregar()
  }, [perfil?.setor])

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setMsg('')

    if (!form.nome_visitante.trim() || !form.data || !form.hora) {
      setErro('Preencha nome, data e hora.')
      return
    }

    if (form.cpf.trim() && !cpfValido(form.cpf)) {
      setErro('CPF inválido.')
      return
    }
    if (!telefoneBrValido(form.telefone)) {
      setErro('Telefone inválido.')
      return
    }

    setSalvando(true)
    try {
      const { error } = await supabase.from('agendamentos').insert({
        nome_visitante: form.nome_visitante.trim(),
        cpf: form.cpf.trim() ? formatCpf(form.cpf) : null,
        telefone: form.telefone.trim() || null,
        data: form.data,
        hora: form.hora,
        sala: form.sala.trim() || null,
        observacao: form.observacao.trim() || null,
        setor: perfil.setor,
        criado_por: perfil.id,
      })
      if (error) throw error
      setMsg('Agendamento enviado à recepção.')
      setForm({
        nome_visitante: '',
        cpf: '',
        telefone: '',
        data: hojeISO(),
        hora: '',
        sala: '',
        observacao: '',
      })
      await carregar()
    } catch (err) {
      setErro(err.message || 'Erro ao agendar.')
    } finally {
      setSalvando(false)
    }
  }

  async function cancelar(id) {
    if (!confirm('Cancelar este agendamento?')) return
    await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id)
    await carregar()
  }

  if (pagina === 'novo') {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Novo agendamento</h1>
          <p className="text-sm mt-1" style={{ color: C.gray60 }}>
            Setor: <strong>{perfil?.setor}</strong> — a recepção verá este aviso.
          </p>
        </div>

        {erro && <Alert type="error">{erro}</Alert>}
        {msg && <Alert type="success">{msg}</Alert>}

        <Card className="p-6">
          <form onSubmit={salvar} className="space-y-4">
            <Field label="Nome do visitante" required>
              <Input
                value={form.nome_visitante}
                onChange={(e) => setForm({ ...form, nome_visitante: e.target.value })}
                placeholder="Nome completo"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="CPF">
                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })} placeholder="000.000.000-00" />
              </Field>
              <Field label="Telefone">
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskTelefoneBr(e.target.value) })} placeholder="(98) 9xxxx-xxxx" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Data" required>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </Field>
              <Field label="Hora" required>
                <Input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
              </Field>
            </div>
            <Field label="Sala">
              <Input value={form.sala} onChange={(e) => setForm({ ...form, sala: e.target.value })} placeholder="Ex.: 302" />
            </Field>
            <Field label="Observação">
              <Textarea rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Opcional" />
            </Field>
            <Btn type="submit" full size="lg" icon={Plus} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Agendar visita'}
            </Btn>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>{perfil?.setor || 'Meu setor'}</h1>
          <p className="text-sm mt-1" style={{ color: C.gray60 }}>Próximos agendamentos</p>
        </div>
        <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}

      <Card>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: C.gray3 }}>
          <Calendar size={18} style={{ color: C.blue }} />
          <h2 className="font-bold" style={{ color: C.blueDark }}>Agendamentos</h2>
        </div>
        {itens.length === 0 ? (
          <Empty>Nenhum agendamento futuro.</Empty>
        ) : (
          itens.map((a) => (
            <div key={a.id} className="px-5 py-4 border-t flex items-center justify-between gap-4" style={{ borderColor: C.gray3 }}>
              <div>
                <div className="font-semibold" style={{ color: C.blueDark }}>{a.nome_visitante}</div>
                <div className="text-sm" style={{ color: C.gray60 }}>
                  {new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {String(a.hora).slice(0, 5)}
                  {a.sala ? ` · Sala ${a.sala}` : ''}
                  {a.status === 'chegou' ? ' · Chegou' : ''}
                  {a.status === 'cancelado' ? ' · Cancelado' : ''}
                </div>
              </div>
              {a.status === 'agendado' && (
                <Btn variant="ghost" size="sm" onClick={() => cancelar(a.id)}>Cancelar</Btn>
              )}
            </div>
          ))
        )}
        <Paginacao pagina={pag} totalPaginas={totalPaginas} totalItens={lista.length} onChange={irPara} />
      </Card>
    </div>
  )
}
