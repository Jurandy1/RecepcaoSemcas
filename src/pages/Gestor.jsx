import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Users, Calendar, ClipboardList, Plus, CalendarPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, PAPEIS } from '../lib/theme'
import {
  maskCpf, maskCpfExibicao, maskTelefoneBr, cpfValido, telefoneBrValido, formatCpf, somenteDigitos,
} from '../lib/br'
import { Btn, Card, Empty, Alert, Field, Input, Textarea } from '../components/ui'
import Paginacao, { usePaginacao } from '../components/Paginacao'
import { useSetoresAtivos, CampoSetorProcurado } from './SetoresProcurados'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function PainelGestor() {
  const [stats, setStats] = useState({ visitantes: 0, agendamentos: 0, usuarios: 0 })

  useEffect(() => {
    async function load() {
      const inicio = `${hojeISO()}T00:00:00`
      const fim = `${hojeISO()}T23:59:59`
      const [v, a, u] = await Promise.all([
        supabase.from('visitantes').select('id', { count: 'exact', head: true }).gte('horario', inicio).lte('horario', fim),
        supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('data', hojeISO()).neq('status', 'cancelado'),
        supabase.from('perfis').select('id', { count: 'exact', head: true }).eq('ativo', true),
      ])
      setStats({
        visitantes: v.count || 0,
        agendamentos: a.count || 0,
        usuarios: u.count || 0,
      })
    }
    load()
  }, [])

  const cards = [
    { label: 'Visitantes hoje', valor: stats.visitantes, icon: ClipboardList, cor: C.blue },
    { label: 'Agendamentos hoje', valor: stats.agendamentos, icon: Calendar, cor: C.orange },
    { label: 'Usuários ativos', valor: stats.usuarios, icon: Users, cor: C.green },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Painel</h1>
        <p className="text-sm mt-1" style={{ color: C.gray60 }}>
          Visão geral do Controle de Recepção
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label} className="p-5">
              <div className="w-9 h-9 flex items-center justify-center mb-3" style={{ backgroundColor: c.cor + '18' }}>
                <Icon size={18} style={{ color: c.cor }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: C.blueDark }}>{c.valor}</div>
              <div className="text-sm" style={{ color: C.gray60 }}>{c.label}</div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function Usuarios() {
  const [lista, setLista] = useState([])
  const [erro, setErro] = useState('')
  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(lista, 10)

  async function carregar() {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('nome')
    if (error) setErro(error.message)
    setLista(data || [])
    reset()
  }

  useEffect(() => { carregar() }, [])

  async function toggleAtivo(u) {
    await supabase.from('perfis').update({ ativo: !u.ativo }).eq('id', u.id)
    await carregar()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Usuários</h1>
          <p className="text-sm mt-1" style={{ color: C.gray60 }}>Pessoas com acesso ao sistema</p>
        </div>
        <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}

      <Card>
        {itens.length === 0 ? (
          <Empty>Nenhum usuário.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.gray1 }}>
                <th className="text-left px-5 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Nome</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>E-mail</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Papel</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Setor</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((u) => (
                <tr key={u.id} className="border-t" style={{ borderColor: C.gray3 }}>
                  <td className="px-5 py-3 font-semibold" style={{ color: C.blueDark }}>{u.nome}</td>
                  <td className="px-3 py-3" style={{ color: C.gray80 }}>{u.email}</td>
                  <td className="px-3 py-3">{PAPEIS[u.papel] || u.papel}</td>
                  <td className="px-3 py-3" style={{ color: C.gray60 }}>{u.setor || '—'}</td>
                  <td className="px-3 py-3">
                    <span style={{ color: u.ativo ? C.green : C.red }}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Btn variant="ghost" size="sm" onClick={() => toggleAtivo(u)}>
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginacao pagina={pagina} totalPaginas={totalPaginas} totalItens={lista.length} onChange={irPara} />
      </Card>
    </div>
  )
}

export function VisitantesGestor() {
  const [lista, setLista] = useState([])
  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(lista, 10)

  async function carregar() {
    const inicio = `${hojeISO()}T00:00:00`
    const fim = `${hojeISO()}T23:59:59`
    const { data } = await supabase
      .from('visitantes')
      .select('*')
      .gte('horario', inicio)
      .lte('horario', fim)
      .order('horario', { ascending: false })
    setLista(data || [])
    reset()
  }

  useEffect(() => { carregar() }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Visitantes de hoje</h1>
          <p className="text-sm mt-1" style={{ color: C.gray60 }}>{new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
      </div>
      <Card>
        {itens.length === 0 ? (
          <Empty>Nenhum visitante hoje.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.gray1 }}>
                <th className="text-left px-5 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Nome</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>CPF</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Setor</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Telefone</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Obs.</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Horário</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((v) => (
                <tr key={v.id} className="border-t" style={{ borderColor: C.gray3 }}>
                  <td className="px-5 py-3 font-semibold" style={{ color: C.blueDark }}>{v.nome}</td>
                  <td className="px-3 py-3 font-mono text-xs">{maskCpfExibicao(v.cpf)}</td>
                  <td className="px-3 py-3">{v.setor}</td>
                  <td className="px-3 py-3">{v.telefone || '—'}</td>
                  <td className="px-3 py-3 text-xs" style={{ color: C.gray60 }}>{v.observacao || '—'}</td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {new Date(v.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginacao pagina={pagina} totalPaginas={totalPaginas} totalItens={lista.length} onChange={irPara} />
      </Card>
    </div>
  )
}

export function AgendamentosGestor({ modoInicial = 'lista' }) {
  const { perfil } = useAuth()
  const [modo, setModo] = useState(modoInicial) // lista | novo
  const [lista, setLista] = useState([])
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(lista, 10)

  useEffect(() => {
    setModo(modoInicial)
  }, [modoInicial])

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

  async function cancelar(id) {
    if (!confirm('Cancelar este agendamento?')) return
    await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id)
    await carregar()
  }

  if (modo === 'novo') {
    return (
      <FormAgendarGestor
        perfil={perfil}
        onVoltar={() => { setModo('lista'); carregar() }}
        onSalvo={() => { setMsg('Agendamento registrado.'); setModo('lista'); carregar() }}
      />
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Agendamentos</h1>
          <p className="text-sm mt-1" style={{ color: C.gray60 }}>
            A partir de hoje · admin e coordenadora também podem agendar visitas
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
          <Btn icon={Plus} onClick={() => { setErro(''); setMsg(''); setModo('novo') }}>
            Agendar visita
          </Btn>
        </div>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <Card>
        {itens.length === 0 ? (
          <Empty>Nenhum agendamento.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.gray1 }}>
                <th className="text-left px-5 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Visitante</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>CPF</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Data</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Hora</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Setor</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Status</th>
                <th className="text-right px-5 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }} />
              </tr>
            </thead>
            <tbody>
              {itens.map((a) => (
                <tr key={a.id} className="border-t" style={{ borderColor: C.gray3 }}>
                  <td className="px-5 py-3 font-semibold" style={{ color: C.blueDark }}>{a.nome_visitante}</td>
                  <td className="px-3 py-3 font-mono text-xs">{maskCpfExibicao(a.cpf)}</td>
                  <td className="px-3 py-3">{new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-3 py-3 font-mono">{String(a.hora).slice(0, 5)}</td>
                  <td className="px-3 py-3">{a.setor}</td>
                  <td className="px-3 py-3">{a.status}</td>
                  <td className="px-5 py-3 text-right">
                    {a.status === 'agendado' && (
                      <Btn variant="ghost" size="sm" onClick={() => cancelar(a.id)}>Cancelar</Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginacao pagina={pagina} totalPaginas={totalPaginas} totalItens={lista.length} onChange={irPara} />
      </Card>
    </div>
  )
}

function SugestoesAgenda({ itens, onPick, visible }) {
  if (!visible || !itens.length) return null
  return (
    <div
      className="absolute left-0 right-0 z-20 mt-1 border shadow-md max-h-64 overflow-y-auto"
      style={{ borderColor: C.gray3, backgroundColor: C.card }}
    >
      {itens.map((item) => (
        <button
          key={item.key}
          type="button"
          className="w-full text-left px-4 py-3 border-b"
          style={{ borderColor: C.gray3, backgroundColor: C.card }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(item)}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.blueBg }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.card }}
        >
          <div className="font-semibold text-base" style={{ color: C.blueDark }}>{item.nome}</div>
          <div className="text-sm" style={{ color: C.gray60 }}>{item.rotulo}</div>
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
    sala: '',
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
        sala: form.sala.trim() || null,
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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.blueDark }}>Novo agendamento</h1>
          <p className="text-base mt-1" style={{ color: C.gray60 }}>
            Digite o nome ou CPF — o sistema avisa se a pessoa já existe ou se há agendamento duplicado.
          </p>
        </div>
        <Btn variant="ghost" onClick={onVoltar}>Voltar</Btn>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}
      {aviso && <Alert type={avisoTipo}>{aviso}</Alert>}

      <Card className="p-6 sm:p-8">
        <form onSubmit={salvar} className="space-y-5" autoComplete="off">
          <Field label="Nome do visitante" required>
            <div className="relative">
              <Input
                large
                value={form.nome_visitante}
                onChange={onNomeChange}
                onFocus={() => setMostrarSug(sugestoes.length > 0)}
                onBlur={() => setTimeout(() => setMostrarSug(false), 150)}
                placeholder="Digite o nome"
                autoFocus
              />
              <SugestoesAgenda itens={sugestoes} visible={mostrarSug} onPick={aplicarSugestao} />
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="CPF" hint="000.000.000-00">
              <Input large value={form.cpf} onChange={onCpfChange} placeholder="000.000.000-00" />
            </Field>
            <Field label="Telefone">
              <Input
                large
                value={form.telefone}
                onChange={(e) => setCampo('telefone', maskTelefoneBr(e.target.value))}
                placeholder="(98) 9xxxx-xxxx"
              />
            </Field>
          </div>

          <Field label="Setor procurado" required hint="Escolha da lista ou use Outro para digitar">
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

          <Field label="Sala">
            <Input large value={form.sala} onChange={(e) => setCampo('sala', e.target.value)} placeholder="Ex.: 302" />
          </Field>

          <Field label="Observação">
            <Textarea
              large
              rows={2}
              value={form.observacao}
              onChange={(e) => setCampo('observacao', e.target.value)}
              placeholder="Opcional"
            />
          </Field>

          <Btn type="submit" full size="xl" icon={CalendarPlus} disabled={salvando}>
            {salvando ? 'Salvando...' : 'REGISTRAR AGENDAMENTO'}
          </Btn>
        </form>
      </Card>
    </div>
  )
}
