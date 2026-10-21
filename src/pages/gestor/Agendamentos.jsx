import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Info,
  Landmark,
  RefreshCw,
  Search,
  User,
  XCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import {
  maskCpf, maskCpfExibicao, maskTelefoneBr, cpfValido, telefoneBrValido, formatCpf, somenteDigitos,
} from '../../lib/br'
import {
  Alert,
  BadgeOrigem,
  Btn,
  Chip,
  Empty,
  Field,
  Input,
  Segmented,
  Textarea,
} from '../../components/ui'
import Paginacao, { usePaginacao } from '../../components/ui/Paginacao'
import { useSetoresAtivos, CampoSetorProcurado } from '../../components/setores'

const STATUS_CHIP = {
  agendado: { tone: 'warn', icon: Clock, label: 'Agendado' },
  chegou: { tone: 'success', icon: CheckCircle2, label: 'Chegou' },
  cancelado: { tone: 'gray', icon: XCircle, label: 'Cancelado' },
}

function StatusAgendamento({ status }) {
  const s = STATUS_CHIP[status] || { tone: 'gray', icon: Info, label: status }
  return (
    <Chip tone={s.tone} icon={s.icon}>
      {s.label}
    </Chip>
  )
}

function dataBr(data) {
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR')
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function AgendamentosGestor({ modoInicial = 'lista', podeAgendar = true }) {
  const { perfil } = useAuth()
  const [modo, setModo] = useState(podeAgendar ? modoInicial : 'lista') // lista | novo
  const [lista, setLista] = useState([])
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState('todos') // todos | hoje | amanha | semana

  const filtrada = useMemo(() => {
    const hoje = hojeISO()
    const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const fimSemana = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

    let base = lista
    if (periodo === 'hoje') base = base.filter((a) => a.data === hoje)
    else if (periodo === 'amanha') base = base.filter((a) => a.data === amanha)
    else if (periodo === 'semana') base = base.filter((a) => a.data <= fimSemana)

    if (!busca.trim()) return base
    const q = busca.trim().toLowerCase()
    return base.filter((a) =>
      `${a.nome_visitante} ${a.cpf || ''} ${a.setor || ''}`.toLowerCase().includes(q)
    )
  }, [lista, busca, periodo])

  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(filtrada, 10)

  useEffect(() => {
    setModo(podeAgendar ? modoInicial : 'lista')
  }, [modoInicial, podeAgendar])

  async function carregar() {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .gte('data', hojeISO())
      .order('data')
      .order('hora')
    if (error) setErro(error.message)
    setLista(data || [])
    reset()
  }

  useEffect(() => { carregar() }, [])

  async function cancelar(ag) {
    if (!podeAgendar) return
    if (!confirm(`Cancelar o agendamento de ${ag.nome_visitante}?`)) return
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', ag.id)
    if (error) {
      setErro(error.message)
      return
    }
    setMsg('Agendamento cancelado.')
    await carregar()
  }

  if (modo === 'novo' && podeAgendar) {
    return (
      <FormAgendarGestor
        perfil={perfil}
        onVoltar={() => { setModo('lista'); carregar() }}
        onSalvo={() => { setMsg('Agendamento registrado.'); setModo('lista'); carregar() }}
      />
    )
  }

  const opcoesPeriodo = [
    { value: 'todos', label: 'Todos' },
    { value: 'hoje', label: 'Hoje' },
    { value: 'amanha', label: 'Amanhã' },
    { value: 'semana', label: 'Esta semana' },
  ]

  const paginacao = (
    <Paginacao
      pagina={pagina}
      totalPaginas={totalPaginas}
      totalItens={filtrada.length}
      onChange={irPara}
      rotulo="agendamento"
    />
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl">Agendamentos</h1>
          <p className="page-sub text-sm text-gray-20 mt-1.5">
            Visitas marcadas a partir de hoje ·{' '}
            {podeAgendar ? `${lista.length} no total` : 'consulta — agendar é só para admin e coordenadora'}
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" icon={RefreshCw} onClick={carregar}>
            <span className="hidden sm:inline">Atualizar</span>
          </Btn>
          {podeAgendar && (
            <Btn
              icon={CalendarPlus}
              onClick={() => {
                setErro('')
                setMsg('')
                setModo('novo')
              }}
            >
              Agendar visita
            </Btn>
          )}
        </div>
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

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
        <Segmented
          className="self-start max-w-full overflow-x-auto"
          valor={periodo}
          onChange={(v) => {
            setPeriodo(v)
            irPara(1)
          }}
          opcoes={opcoesPeriodo}
        />
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-5" />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              irPara(1)
            }}
            placeholder="Buscar visitante, CPF ou setor..."
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {itens.length === 0 ? (
        <div className="card">
          <Empty icon={Calendar}>Nenhum agendamento encontrado para este filtro.</Empty>
        </div>
      ) : (
        <>
          <div className="card hidden md:block">
            <div className="table-wrap">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Visitante</th>
                    <th className="th">CPF</th>
                    <th className="th">Data</th>
                    <th className="th">Hora</th>
                    <th className="th">Setor</th>
                    <th className="th">Status</th>
                    {podeAgendar && <th className="th text-right" />}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((a) => (
                    <tr key={a.id}>
                      <td className="td font-semibold text-blue-dark">{a.nome_visitante}</td>
                      <td className="td font-mono text-xs">{a.cpf ? maskCpfExibicao(a.cpf) : '—'}</td>
                      <td className="td whitespace-nowrap">{dataBr(a.data)}</td>
                      <td className="td font-mono font-semibold">{String(a.hora).slice(0, 5)}</td>
                      <td className="td">{a.setor}</td>
                      <td className="td">
                        <StatusAgendamento status={a.status} />
                      </td>
                      {podeAgendar && (
                        <td className="td text-right">
                          {a.status === 'agendado' && (
                            <Btn variant="dangerGhost" size="xs" onClick={() => cancelar(a)}>
                              Cancelar agendamento
                            </Btn>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paginacao}
          </div>

          <div className="md:hidden space-y-3">
            {itens.map((a) => (
              <div key={a.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-blue-dark">{a.nome_visitante}</div>
                    <div className="text-xs text-gray-20 font-mono">
                      {a.cpf ? `CPF ${maskCpfExibicao(a.cpf)}` : 'Sem CPF'}
                    </div>
                  </div>
                  <StatusAgendamento status={a.status} />
                </div>
                <div className="text-sm text-gray-60 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} />
                    {dataBr(a.data)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} />
                    <strong>{String(a.hora).slice(0, 5)}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 size={14} />
                    {a.setor}
                  </span>
                </div>
                {podeAgendar && a.status === 'agendado' && (
                  <div className="mt-3 pt-3 border-t border-gray-2">
                    <Btn variant="dangerGhost" size="sm" full onClick={() => cancelar(a)}>
                      Cancelar agendamento
                    </Btn>
                  </div>
                )}
              </div>
            ))}
            <div className="card">{paginacao}</div>
          </div>
        </>
      )}
    </div>
  )
}

function SugestoesAgenda({ itens, onPick, visible }) {
  if (!visible || !itens.length) return null
  return (
    <div className="absolute left-0 right-0 z-20 mt-1.5 rounded-lg border border-gray-3 bg-white shadow-e3 overflow-hidden max-h-72 overflow-y-auto">
      {itens.map((item) => (
        <button
          key={item.key}
          type="button"
          className="w-full text-left px-4 py-3 border-b border-gray-2 last:border-b-0 hover:bg-blue-10 focus:bg-blue-10"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(item)}
        >
          <div className="flex items-center gap-2">
            {item.tipo === 'agendamento' ? (
              <Chip tone="warn" icon={Clock} xs className="flex-shrink-0">
                Já agendado
              </Chip>
            ) : (
              <BadgeOrigem servidor={item.tipo === 'servidor'} className="flex-shrink-0">
                {item.tipo === 'servidor' ? (
                  <>
                    <Landmark size={12} />
                    Servidor
                  </>
                ) : (
                  <>
                    <User size={12} />
                    Já cadastrada
                  </>
                )}
              </BadgeOrigem>
            )}
            <div className="font-semibold text-base text-blue-dark truncate">{item.nome}</div>
          </div>
          <div className="text-sm text-gray-20 mt-1">{item.rotulo}</div>
        </button>
      ))}
    </div>
  )
}

function FormAgendarGestor({ perfil, onVoltar, onSalvo }) {
  const { setores } = useSetoresAtivos()
  const [form, setForm] = useState({
    nome_visitante: '',
    cpf: '',
    telefone: '',
    data: hojeISO(),
    hora: '',
    setor: '',
    observacao: '',
  })
  const [aviso, setAviso] = useState('')
  const [avisoTipo, setAvisoTipo] = useState('info')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [sugestoes, setSugestoes] = useState([])
  const [mostrarSug, setMostrarSug] = useState(false)
  const debounceRef = useRef(null)

  function setCampo(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function aplicarSugestao(item) {
    setForm((f) => ({
      ...f,
      nome_visitante: item.nome || f.nome_visitante,
      cpf: item.cpf ? formatCpf(item.cpf) : f.cpf,
      telefone: item.telefone ? maskTelefoneBr(item.telefone) : f.telefone,
      setor: item.setor || f.setor,
    }))
    if (item.tipo === 'servidor') {
      setAvisoTipo('info')
      setAviso(`Servidor municipal · ${item.setor}`)
    } else if (item.tipo === 'agendamento') {
      setAvisoTipo('warn')
      setAviso(item.rotulo)
    } else {
      setAvisoTipo('info')
      setAviso('Visitante já cadastrado anteriormente — dados preenchidos.')
    }
    setSugestoes([])
    setMostrarSug(false)
  }

  const buscarSugestoesNome = useCallback(async (texto) => {
    const q = texto.trim()
    if (q.length < 3) {
      setSugestoes([])
      return
    }

    const [{ data: serv }, { data: vis }, { data: ags }] = await Promise.all([
      supabase.from('servidores').select('id, nome, lotacao, cpf, matricula').ilike('nome', `%${q}%`).eq('ativo', true).limit(6),
      supabase.from('visitantes').select('id, nome, cpf, telefone, setor, horario').ilike('nome', `%${q}%`).order('horario', { ascending: false }).limit(20),
      supabase.from('agendamentos').select('id, nome_visitante, cpf, telefone, setor, data, hora, status').ilike('nome_visitante', `%${q}%`).neq('status', 'cancelado').gte('data', hojeISO()).order('data').limit(10),
    ])

    const itens = []
    for (const s of serv || []) {
      itens.push({
        key: `s-${s.id}`,
        tipo: 'servidor',
        nome: s.nome,
        cpf: s.cpf || '',
        telefone: '',
        setor: s.lotacao,
        rotulo: `Servidor municipal · ${s.lotacao}${s.matricula ? ` · Mat. ${s.matricula}` : ''}`,
      })
    }

    const vistos = new Set()
    for (const v of vis || []) {
      const k = (v.cpf || v.nome).toLowerCase()
      if (vistos.has(k)) continue
      vistos.add(k)
      itens.push({
        key: `v-${v.id}`,
        tipo: 'visitante',
        nome: v.nome,
        cpf: v.cpf || '',
        telefone: v.telefone || '',
        setor: v.setor || '',
        rotulo: `Já cadastrado · último setor ${v.setor || '—'}`,
      })
      if (itens.filter((i) => i.tipo === 'visitante').length >= 5) break
    }

    for (const a of ags || []) {
      itens.push({
        key: `a-${a.id}`,
        tipo: 'agendamento',
        nome: a.nome_visitante,
        cpf: a.cpf || '',
        telefone: a.telefone || '',
        setor: a.setor || '',
        rotulo: `Já há agendamento · ${new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')} ${String(a.hora).slice(0, 5)} · ${a.setor} (${a.status})`,
      })
    }

    setSugestoes(itens.slice(0, 12))
    if ((serv || []).length === 0 && q.length >= 4) {
      setAvisoTipo('warn')
      setAviso('Nome não encontrado na lista de servidores. Pode ser visitante externo.')
    }
  }, [])

  const verificarDuplicata = useCallback(async (cpfFormatado, data, nome) => {
    const queries = []
    if (cpfFormatado && cpfValido(cpfFormatado)) {
      queries.push(
        supabase
          .from('agendamentos')
          .select('id, nome_visitante, data, hora, setor, status')
          .eq('cpf', cpfFormatado)
          .eq('data', data)
          .neq('status', 'cancelado')
          .limit(5)
      )
    } else if (nome?.trim()) {
      queries.push(
        supabase
          .from('agendamentos')
          .select('id, nome_visitante, data, hora, setor, status')
          .ilike('nome_visitante', nome.trim())
          .eq('data', data)
          .neq('status', 'cancelado')
          .limit(5)
      )
    } else {
      return []
    }
    const [{ data: dups }] = await Promise.all(queries)
    return dups || []
  }, [])

  const buscarPorCpf = useCallback(async (cpfFormatado) => {
    if (!cpfValido(cpfFormatado)) return

    const [{ data: serv }, { data: vis }, dups] = await Promise.all([
      supabase.from('servidores').select('id, nome, lotacao, cpf, matricula').eq('cpf', cpfFormatado).maybeSingle(),
      supabase.from('visitantes').select('id, nome, cpf, telefone, setor, horario').eq('cpf', cpfFormatado).order('horario', { ascending: false }).limit(1).maybeSingle(),
      verificarDuplicata(cpfFormatado, form.data, ''),
    ])

    if (dups.length) {
      const d = dups[0]
      setAvisoTipo('warn')
      setAviso(
        `Atenção: já existe agendamento para este CPF em ${new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')} às ${String(d.hora).slice(0, 5)} · setor ${d.setor}.`
      )
    }

    if (serv) {
      aplicarSugestao({
        key: `s-${serv.id}`,
        tipo: 'servidor',
        nome: serv.nome,
        cpf: serv.cpf || cpfFormatado,
        telefone: '',
        setor: serv.lotacao,
        rotulo: `Servidor municipal · ${serv.lotacao}`,
      })
      if (dups.length) {
        setAvisoTipo('warn')
        setAviso(
          `Servidor encontrado, mas já há agendamento neste dia para o CPF · ${new Date(dups[0].data + 'T12:00:00').toLocaleDateString('pt-BR')} ${String(dups[0].hora).slice(0, 5)}.`
        )
      }
      return
    }

    if (vis) {
      aplicarSugestao({
        key: `v-${vis.id}`,
        tipo: 'visitante',
        nome: vis.nome,
        cpf: vis.cpf,
        telefone: vis.telefone || '',
        setor: vis.setor || '',
        rotulo: `Já cadastrado · último setor ${vis.setor || '—'}`,
      })
      setAvisoTipo(dups.length ? 'warn' : 'info')
      setAviso(
        dups.length
          ? `Já cadastrado e já possui agendamento neste dia — evite duplicar.`
          : 'Dados da última visita preenchidos. Se for servidor, busque também pelo nome (a lista importada quase não traz CPF).'
      )
      return
    }

    if (!dups.length) {
      setAvisoTipo('info')
      setAviso('CPF ainda não vinculado a nenhum servidor (a lista importada quase não traz CPF). Busque pelo nome se for servidor municipal.')
    }
  }, [form.data, verificarDuplicata])

  function onNomeChange(e) {
    const nome = e.target.value
    setCampo('nome_visitante', nome)
    setAviso('')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      buscarSugestoesNome(nome).then(() => setMostrarSug(true))
    }, 300)
  }

  function onCpfChange(e) {
    const cpf = maskCpf(e.target.value)
    setCampo('cpf', cpf)
    setAviso('')
    if (somenteDigitos(cpf).length === 11) {
      if (!cpfValido(cpf)) {
        setErro('CPF inválido.')
        return
      }
      setErro('')
      buscarPorCpf(cpf)
    }
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')

    if (!form.nome_visitante.trim() || !form.data || !form.hora || !form.setor.trim()) {
      setErro('Preencha nome, data, hora e setor.')
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

    const cpfFmt = form.cpf.trim() ? formatCpf(form.cpf) : null
    const dups = await verificarDuplicata(cpfFmt, form.data, form.nome_visitante)
    if (dups.length) {
      const mesmoSetor = dups.find((d) => d.setor?.toLowerCase() === form.setor.trim().toLowerCase())
      if (mesmoSetor) {
        setErro(
          `Agendamento duplicado: já existe para esta pessoa em ${new Date(mesmoSetor.data + 'T12:00:00').toLocaleDateString('pt-BR')} às ${String(mesmoSetor.hora).slice(0, 5)} no setor ${mesmoSetor.setor}.`
        )
        setAvisoTipo('warn')
        setAviso('Não é permitido cadastrar o mesmo agendamento em duplicidade.')
        return
      }
      const ok = confirm(
        `Já existe agendamento desta pessoa neste dia (setor ${dups[0].setor}). Deseja agendar mesmo assim para outro setor?`
      )
      if (!ok) return
    }

    setSalvando(true)
    try {
      const { error } = await supabase.from('agendamentos').insert({
        nome_visitante: form.nome_visitante.trim(),
        cpf: cpfFmt,
        telefone: form.telefone.trim() || null,
        data: form.data,
        hora: form.hora,
        observacao: form.observacao.trim() || null,
        setor: form.setor.trim(),
        criado_por: perfil?.id,
      })
      if (error) throw error
      onSalvo?.()
    } catch (err) {
      setErro(err.message || 'Erro ao agendar.')
    } finally {
      setSalvando(false)
    }
  }

  const iconeAviso = avisoTipo === 'warn' ? AlertTriangle : Info

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-5">
      <Btn variant="ghost" size="sm" icon={ArrowLeft} onClick={onVoltar}>
        Voltar para agendamentos
      </Btn>

      <div>
        <h1 className="page-title text-2xl sm:text-3xl">Novo agendamento</h1>
        <p className="page-sub text-sm text-gray-20 mt-1.5">
          Digite o nome ou CPF. O sistema avisa se a pessoa já existe ou se há agendamento duplicado.
        </p>
      </div>

      {erro && (
        <Alert type="error" icon={AlertTriangle}>
          {erro}
        </Alert>
      )}
      {aviso && (
        <Alert type={avisoTipo} icon={iconeAviso}>
          {aviso}
        </Alert>
      )}

      <div className="card shadow-e2">
        <form onSubmit={salvar} className="p-5 sm:p-8 space-y-5" autoComplete="off">
          <Field label="Nome do visitante" required>
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-5" />
              <Input
                large
                value={form.nome_visitante}
                onChange={onNomeChange}
                onFocus={() => setMostrarSug(sugestoes.length > 0)}
                onBlur={() => setTimeout(() => setMostrarSug(false), 150)}
                placeholder="Digite o nome completo"
                autoFocus
                style={{ paddingLeft: 44 }}
              />
              <SugestoesAgenda itens={sugestoes} visible={mostrarSug} onPick={aplicarSugestao} />
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="CPF" hint="000.000.000-00">
              <Input
                large
                className="font-mono"
                value={form.cpf}
                onChange={onCpfChange}
                placeholder="000.000.000-00"
              />
            </Field>
            <Field label="Telefone">
              <Input
                large
                className="font-mono"
                value={form.telefone}
                onChange={(e) => setCampo('telefone', maskTelefoneBr(e.target.value))}
                placeholder="(98) 9xxxx-xxxx"
              />
            </Field>
          </div>

          <Field
            label="Setor de destino"
            required
            hint="É para onde a pessoa vai. Pesquise pelo nome ou digite um setor manualmente."
          >
            <CampoSetorProcurado
              large
              value={form.setor}
              onChange={(v) => setCampo('setor', v)}
              setores={setores}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Data" required>
              <Input large type="date" value={form.data} onChange={(e) => setCampo('data', e.target.value)} />
            </Field>
            <Field label="Hora" required>
              <Input large type="time" value={form.hora} onChange={(e) => setCampo('hora', e.target.value)} />
            </Field>
          </div>

          <Field label="Observação">
            <Textarea
              large
              rows={2}
              value={form.observacao}
              onChange={(e) => setCampo('observacao', e.target.value)}
              placeholder="Opcional"
            />
          </Field>

          <div className="pt-4 border-t border-gray-2 flex flex-col sm:flex-row gap-3">
            <Btn variant="outline" size="lg" onClick={onVoltar} className="sm:flex-1">
              Cancelar
            </Btn>
            <button type="submit" className="btn btn-primary btn-lg sm:flex-[2]" disabled={salvando}>
              <CalendarPlus size={20} />
              {salvando ? 'Salvando...' : 'Registrar agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
