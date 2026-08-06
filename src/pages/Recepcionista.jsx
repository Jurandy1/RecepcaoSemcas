import { useEffect, useState } from 'react'
import { UserPlus, Calendar, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C } from '../lib/theme'
import { Btn, Field, Input, Card, Alert, Empty } from '../components/ui'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Recepcionista({ pagina }) {
  const { perfil } = useAuth()
  const [visitantes, setVisitantes] = useState([])
  const [agendamentos, setAgendamentos] = useState([])
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', cpf: '', setor: '', telefone: '' })

  async function carregar() {
    const inicio = `${hojeISO()}T00:00:00`
    const fim = `${hojeISO()}T23:59:59`

    const [{ data: v }, { data: a }] = await Promise.all([
      supabase
        .from('visitantes')
        .select('*')
        .gte('horario', inicio)
        .lte('horario', fim)
        .order('horario', { ascending: false }),
      supabase
        .from('agendamentos')
        .select('*')
        .eq('data', hojeISO())
        .neq('status', 'cancelado')
        .order('hora', { ascending: true }),
    ])

    setVisitantes(v || [])
    setAgendamentos(a || [])
  }

  useEffect(() => {
    carregar()
  }, [])

  async function registrar(e) {
    e.preventDefault()
    setErro('')
    setMsg('')

    if (!form.nome.trim() || !form.cpf.trim() || !form.setor.trim()) {
      setErro('Preencha Nome, CPF e Setor.')
      return
    }

    setSalvando(true)
    try {
      const { error } = await supabase.from('visitantes').insert({
        nome: form.nome.trim(),
        cpf: form.cpf.trim(),
        telefone: form.telefone.trim() || null,
        setor: form.setor.trim(),
        tipo: 'espontanea',
        registrado_por: perfil?.id,
      })
      if (error) throw error
      setForm({ nome: '', cpf: '', setor: '', telefone: '' })
      setMsg('Visitante registrado com sucesso.')
      await carregar()
    } catch (err) {
      setErro(err.message || 'Erro ao registrar.')
    } finally {
      setSalvando(false)
    }
  }

  async function marcarChegou(ag) {
    setErro('')
    try {
      await supabase.from('agendamentos').update({ status: 'chegou' }).eq('id', ag.id)
      const { error } = await supabase.from('visitantes').insert({
        nome: ag.nome_visitante,
        cpf: ag.cpf || '—',
        telefone: ag.telefone,
        setor: ag.setor,
        tipo: 'agendada',
        agendamento_id: ag.id,
        registrado_por: perfil?.id,
      })
      if (error) throw error
      setMsg(`${ag.nome_visitante} registrado(a) na chegada.`)
      await carregar()
    } catch (err) {
      setErro(err.message || 'Erro ao registrar chegada.')
    }
  }

  if (pagina === 'agenda') {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: C.blueDark }}>Agenda do dia</h1>
            <p className="text-base mt-1" style={{ color: C.gray60 }}>
              Visitas agendadas pelos setores — {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
        </div>

        {erro && <Alert type="error">{erro}</Alert>}
        {msg && <Alert type="success">{msg}</Alert>}

        <Card>
          {agendamentos.length === 0 ? (
            <Empty>Nenhum agendamento para hoje.</Empty>
          ) : (
            <div>
              {agendamentos.map((a) => (
                <div key={a.id} className="px-5 py-5 border-b flex flex-col sm:flex-row sm:items-center gap-4" style={{ borderColor: C.gray3 }}>
                  <div className="flex-1">
                    <div className="text-xl font-bold" style={{ color: C.blueDark }}>{a.nome_visitante}</div>
                    <div className="text-base mt-1" style={{ color: C.gray60 }}>
                      {String(a.hora).slice(0, 5)} · Setor: <strong>{a.setor}</strong>
                      {a.sala ? ` · Sala ${a.sala}` : ''}
                    </div>
                    {a.observacao && (
                      <div className="text-sm mt-1" style={{ color: C.gray20 }}>{a.observacao}</div>
                    )}
                  </div>
                  {a.status === 'chegou' ? (
                    <span className="text-base font-semibold px-3 py-2" style={{ backgroundColor: C.greenBg, color: C.green }}>
                      Já chegou
                    </span>
                  ) : (
                    <Btn size="lg" icon={UserPlus} onClick={() => marcarChegou(a)}>
                      Chegou — registrar
                    </Btn>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    )
  }

  // Página principal — cadastro simples
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: C.blueDark }}>Registrar visitante</h1>
        <p className="text-base mt-1" style={{ color: C.gray60 }}>
          Preencha os campos abaixo e clique em Registrar.
        </p>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <Card className="p-6 sm:p-8">
        <form onSubmit={registrar} className="space-y-5">
          <Field label="Nome completo" required>
            <Input
              large
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome da pessoa que chegou"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="CPF" required>
              <Input
                large
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </Field>
            <Field label="Telefone">
              <Input
                large
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(98) 9xxxx-xxxx"
              />
            </Field>
          </div>

          <Field label="Setor procurado" required hint="Digite o nome do setor">
            <Input
              large
              value={form.setor}
              onChange={(e) => setForm({ ...form, setor: e.target.value })}
              placeholder="Ex.: Gabinete, Recursos Humanos..."
            />
          </Field>

          <Btn type="submit" full size="xl" icon={UserPlus} disabled={salvando}>
            {salvando ? 'Salvando...' : 'REGISTRAR VISITANTE'}
          </Btn>
        </form>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: C.gray3 }}>
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: C.blue }} />
            <h2 className="font-bold text-lg" style={{ color: C.blueDark }}>Registrados hoje ({visitantes.length})</h2>
          </div>
          <Btn variant="ghost" size="sm" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
        </div>
        {visitantes.length === 0 ? (
          <Empty>Nenhum visitante registrado hoje.</Empty>
        ) : (
          <div>
            {visitantes.map((v) => (
              <div key={v.id} className="px-5 py-4 border-t flex justify-between gap-4" style={{ borderColor: C.gray3 }}>
                <div>
                  <div className="text-lg font-semibold" style={{ color: C.blueDark }}>{v.nome}</div>
                  <div className="text-sm" style={{ color: C.gray60 }}>
                    {v.setor} · CPF {v.cpf}
                    {v.tipo === 'agendada' ? ' · Agendada' : ''}
                  </div>
                </div>
                <div className="text-base font-mono" style={{ color: C.gray80 }}>
                  {new Date(v.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
