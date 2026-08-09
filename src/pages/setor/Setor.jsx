import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Lock,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { maskCpf, maskTelefoneBr, cpfValido, telefoneBrValido, formatCpf } from '../../lib/br'
import { Alert, Btn, Chip, Empty, Field, Input, Textarea } from '../../components/ui'
import Paginacao, { usePaginacao } from '../../components/ui/Paginacao'

const STATUS_CHIP = {
  agendado: { tone: 'warn', icon: Clock, label: 'Aguardando chegada' },
  chegou: { tone: 'success', icon: CheckCircle2, label: 'Chegou' },
  cancelado: { tone: 'gray', icon: XCircle, label: 'Cancelado' },
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Setor({ pagina }) {
  const { perfil } = useAuth()
  const setorFixo = (perfil?.setor || '').trim()
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
    observacao: '',
  })
  const { pagina: pag, totalPaginas, itens, irPara, reset } = usePaginacao(lista, 10)

  async function carregar() {
    if (!setorFixo) {
      setLista([])
      return
    }
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('setor', setorFixo)
      .gte('data', hojeISO())
      .order('data', { ascending: true })
      .order('hora', { ascending: true })

    if (error) setErro(error.message)
    setLista(data || [])
    reset()
  }

  useEffect(() => {
    carregar()
  }, [setorFixo])

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setMsg('')

    if (!setorFixo) {
      setErro('Seu cadastro não tem setor definido. Peça um novo convite de Setor (agendamento) informando o nome do setor.')
      return
    }

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
        observacao: form.observacao.trim() || null,
        setor: setorFixo,
        criado_por: perfil.id,
      })
      if (error) throw error
      setMsg(`Agendamento criado para o setor ${setorFixo}. A recepção será avisada.`)
      setForm({
        nome_visitante: '',
        cpf: '',
        telefone: '',
        data: hojeISO(),
        hora: '',
        observacao: '',
      })
      await carregar()
    } catch (err) {
      setErro(err.message || 'Erro ao agendar.')
    } finally {
      setSalvando(false)
    }
  }

  async function cancelar(a) {
    if (!confirm(`Cancelar o agendamento de ${a.nome_visitante}?`)) return
    setErro('')
    setMsg('')
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', a.id)
    if (error) {
      setErro(error.message)
      return
    }
    setMsg(`Agendamento de ${a.nome_visitante} cancelado. A recepção não vai mais esperar a pessoa.`)
    await carregar()
  }

  if (!setorFixo) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <Alert type="error" icon={AlertTriangle} title="Cadastro sem setor">
          Seu usuário de Setor (agendamento) está sem o nome do setor. Peça à administração um novo
          convite e, no cadastro, informe o setor obrigatoriamente.
        </Alert>
      </div>
    )
  }

  if (pagina === 'novo') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl">Novo agendamento</h1>
          <p className="page-sub text-sm text-gray-20 mt-1.5">
            Este agendamento ficará vinculado ao seu setor.
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
          <form onSubmit={salvar} className="p-5 sm:p-6 space-y-4">
            <Field
              label="Setor de destino"
              hint="Reservado para você no cadastro — é para onde o visitante vai e não pode ser alterado."
            >
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-5" />
                <Input
                  value={setorFixo}
                  readOnly
                  className="font-semibold"
                  style={{ paddingLeft: 38 }}
                />
              </div>
            </Field>
            <Field label="Nome do visitante" required>
              <Input
                value={form.nome_visitante}
                onChange={(e) => setForm({ ...form, nome_visitante: e.target.value })}
                placeholder="Nome completo"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="CPF">
                <Input
                  className="font-mono"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })}
                  placeholder="000.000.000-00"
                />
              </Field>
              <Field label="Telefone">
                <Input
                  className="font-mono"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: maskTelefoneBr(e.target.value) })}
                  placeholder="(98) 9xxxx-xxxx"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Data" required>
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                />
              </Field>
              <Field label="Hora" required>
                <Input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Observação">
              <Textarea
                rows={2}
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                placeholder="Opcional"
              />
            </Field>
            <div className="pt-3 border-t border-gray-2">
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={salvando}>
                <CalendarPlus size={20} />
                {salvando ? 'Salvando...' : `Agendar para ${setorFixo}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue" />
            <Chip tone="blue">Meu setor</Chip>
          </div>
          <h1 className="page-title text-2xl sm:text-3xl mt-2">{setorFixo}</h1>
          <p className="page-sub text-sm text-gray-20 mt-1.5">
            Visitas marcadas para o seu setor · você pode cancelar quem não vem mais
          </p>
        </div>
        <Btn variant="outline" icon={RefreshCw} onClick={carregar}>
          Atualizar
        </Btn>
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

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-2 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-blue-dark flex items-center gap-2">
            <Calendar size={16} />
            Agendamentos
          </h2>
          <span className="text-xs text-gray-20">{lista.length} no total</span>
        </div>

        {itens.length === 0 ? (
          <Empty icon={Calendar}>Nenhum agendamento futuro.</Empty>
        ) : (
          <div className="divide-y divide-gray-2">
            {itens.map((a) => {
              const st = STATUS_CHIP[a.status] || STATUS_CHIP.agendado
              const chegou = a.status === 'chegou'
              return (
                <div
                  key={a.id}
                  className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`flex flex-col items-center justify-center px-3 py-1.5 rounded flex-shrink-0 min-w-[58px] ${
                        chegou ? 'bg-success-bg' : 'bg-warning-bg'
                      }`}
                    >
                      <div
                        className={`text-base font-mono font-bold leading-none ${
                          chegou ? 'text-success-dark' : 'text-warning-dark'
                        }`}
                      >
                        {String(a.hora).slice(0, 5)}
                      </div>
                      <div
                        className={`text-[9px] font-semibold uppercase tracking-wider mt-0.5 ${
                          chegou ? 'text-success-dark' : 'text-warning-dark'
                        }`}
                      >
                        {new Date(`${a.data}T12:00:00`).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-blue-dark">{a.nome_visitante}</div>
                        <Chip tone={st.tone} icon={st.icon}>
                          {st.label}
                        </Chip>
                      </div>
                      {a.observacao && (
                        <div className="text-xs text-gray-20 mt-1 italic">“{a.observacao}”</div>
                      )}
                    </div>
                  </div>
                  {a.status === 'agendado' && (
                    <Btn variant="dangerGhost" size="sm" onClick={() => cancelar(a)} className="flex-shrink-0">
                      Cancelar agendamento
                    </Btn>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <Paginacao
          pagina={pag}
          totalPaginas={totalPaginas}
          totalItens={lista.length}
          onChange={irPara}
          rotulo="agendamento"
        />
      </div>
    </div>
  )
}
