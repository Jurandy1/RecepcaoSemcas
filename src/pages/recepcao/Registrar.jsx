import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Info,
  Landmark,
  Search,
  User,
  UserPlus,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { maskCpf, maskTelefoneBr, cpfValido, telefoneBrValido, formatCpf } from '../../lib/br'
import {
  Alert,
  BadgeOrigem,
  Btn,
  Field,
  Input,
  Textarea,
} from '../../components/ui'
import { useSetoresAtivos, CampoSetorProcurado } from '../../components/setores'

function Sugestoes({ itens, onPick, visible }) {
  if (!visible || !itens.length) return null
  return (
    <div className="absolute left-0 right-0 z-20 mt-1.5 rounded-lg border border-gray-3 bg-white shadow-e3 overflow-hidden max-h-72 overflow-y-auto">
      {itens.map((item) => {
        const servidor = item.tipo === 'servidor' || Boolean(item.servidor_id)
        return (
          <button
            key={item.key}
            type="button"
            className="w-full text-left px-4 py-3 border-b border-gray-2 last:border-b-0 hover:bg-blue-10 focus:bg-blue-10"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(item)}
          >
            <div className="flex items-center gap-2">
              <BadgeOrigem servidor={servidor} className="flex-shrink-0">
                {servidor ? (
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
              <div className="font-semibold text-base text-blue-dark truncate">{item.nome}</div>
            </div>
            <div className="text-sm text-gray-20 mt-1">{item.rotulo}</div>
          </button>
        )
      })}
    </div>
  )
}

export function FormRegistrar({ onRegistrado }) {
  const { perfil } = useAuth()
  const { setores } = useSetoresAtivos()
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    setor: '',
    observacao: '',
  })
  const [servidorId, setServidorId] = useState(null)
  const [orgao, setOrgao] = useState('')
  const [servidorSemCpf, setServidorSemCpf] = useState(false)
  const [aviso, setAviso] = useState('')
  const [avisoTipo, setAvisoTipo] = useState('info')
  const [erro, setErro] = useState('')
  const [msgOk, setMsgOk] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [sugestoes, setSugestoes] = useState([])
  const [mostrarSug, setMostrarSug] = useState(false)
  const [campoSug, setCampoSug] = useState(null)
  const debounceRef = useRef(null)
  const servidorIdRef = useRef(null)
  const orgaoRef = useRef('')
  const nomeRef = useRef(null)
  const cpfRef = useRef(null)
  const setorRef = useRef(null)

  useEffect(() => { servidorIdRef.current = servidorId }, [servidorId])
  useEffect(() => { orgaoRef.current = orgao }, [orgao])

  function setCampo(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function focarProximoCampo({ cpf, setor }) {
    requestAnimationFrame(() => {
      if (!setor?.trim()) {
        setorRef.current?.focus()
        return
      }
      if (!cpf || String(cpf).replace(/\D/g, '').length < 11) {
        cpfRef.current?.focus()
        return
      }
      nomeRef.current?.focus()
    })
  }

  function marcarServidor(s, { semCpf = false } = {}) {
    setServidorId(s.id)
    setOrgao(s.lotacao || s.setor || '')
    setServidorSemCpf(semCpf)
    setAvisoTipo('info')
    if (semCpf) {
      setAviso(`Servidor municipal · Órgão: ${s.lotacao || s.setor || '—'} — sem CPF no cadastro (opcional vincular).`)
    } else {
      setAviso(`Servidor municipal · Órgão: ${s.lotacao || s.setor || '—'}${s.matricula ? ` · Mat. ${s.matricula}` : ''}`)
    }
  }

  function aplicarSugestao(item) {
    const cpfNovo = item.cpf ? formatCpf(item.cpf) : undefined
    const setorNovo = item.tipo === 'servidor' ? undefined : (item.setor || undefined)
    setForm((f) => ({
      ...f,
      nome: item.nome || f.nome,
      cpf: cpfNovo || f.cpf,
      telefone: item.telefone ? maskTelefoneBr(item.telefone) : f.telefone,
      setor: setorNovo !== undefined ? (setorNovo || f.setor) : f.setor,
    }))

    if (item.tipo === 'servidor') {
      const semCpf = !item.cpf
      marcarServidor({
        id: item.id,
        lotacao: item.orgao || item.setor,
        matricula: item.matricula,
      }, { semCpf })
      focarProximoCampo({
        cpf: item.cpf || '',
        setor: form.setor,
      })
    } else {
      if (item.servidor_id) {
        marcarServidor({
          id: item.servidor_id,
          lotacao: item.orgao || '',
          matricula: item.matricula,
        })
      } else {
        setServidorId(null)
        setOrgao('')
        setServidorSemCpf(false)
        setAvisoTipo('info')
        setAviso('Visitante já cadastrado anteriormente')
      }
      focarProximoCampo({
        cpf: item.cpf || form.cpf,
        setor: item.setor || form.setor,
      })
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

    const [{ data: serv }, { data: vis }] = await Promise.all([
      supabase
        .from('servidores')
        .select('id, nome, lotacao, cpf, matricula')
        .ilike('nome', `%${q}%`)
        .eq('ativo', true)
        .limit(6),
      supabase
        .from('visitantes')
        .select('id, nome, cpf, telefone, setor, horario, servidor_id, servidores(lotacao, matricula)')
        .ilike('nome', `%${q}%`)
        .order('horario', { ascending: false })
        .limit(20),
    ])

    const itens = []
    for (const s of serv || []) {
      itens.push({
        key: `s-${s.id}`,
        tipo: 'servidor',
        id: s.id,
        nome: s.nome,
        cpf: s.cpf || '',
        telefone: '',
        setor: s.lotacao,
        orgao: s.lotacao,
        matricula: s.matricula,
        rotulo: `Servidor municipal · Órgão ${s.lotacao}${s.matricula ? ` · Mat. ${s.matricula}` : ''}${s.cpf ? '' : ' · sem CPF'}`,
      })
    }

    const vistos = new Set()
    for (const v of vis || []) {
      const k = (v.cpf || v.nome).toLowerCase()
      if (vistos.has(k)) continue
      vistos.add(k)
      const org = v.servidores?.lotacao || ''
      itens.push({
        key: `v-${v.id}`,
        tipo: 'visitante',
        id: null,
        nome: v.nome,
        cpf: v.cpf || '',
        telefone: v.telefone || '',
        setor: v.setor || '',
        servidor_id: v.servidor_id || null,
        orgao: org,
        matricula: v.servidores?.matricula,
        rotulo: v.servidor_id
          ? `Já cadastrado · Servidor · Órgão ${org || '—'} · último destino ${v.setor || '—'}`
          : `Já cadastrado · último setor ${v.setor || '—'}`,
      })
      if (itens.filter((i) => i.tipo === 'visitante').length >= 6) break
    }

    setSugestoes(itens.slice(0, 12))
    if ((serv || []).length === 0 && q.length >= 4) {
      setAvisoTipo('warn')
      setAviso('Nome não encontrado na lista de servidores do município. Pode ser visitante externo.')
    }
  }, [])

  const buscarPorCpf = useCallback(async (cpfFormatado) => {
    if (!cpfValido(cpfFormatado)) {
      setSugestoes([])
      return
    }

    const sidAtual = servidorIdRef.current
    const orgaoAtual = orgaoRef.current

    const [{ data: serv }, { data: vis }] = await Promise.all([
      supabase
        .from('servidores')
        .select('id, nome, lotacao, cpf, matricula')
        .eq('cpf', cpfFormatado)
        .maybeSingle(),
      supabase
        .from('visitantes')
        .select('id, nome, cpf, telefone, setor, horario, servidor_id, servidores(lotacao, matricula)')
        .eq('cpf', cpfFormatado)
        .order('horario', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (serv) {
      aplicarSugestao({
        key: `s-${serv.id}`,
        tipo: 'servidor',
        id: serv.id,
        nome: serv.nome,
        cpf: serv.cpf || cpfFormatado,
        telefone: '',
        setor: serv.lotacao,
        orgao: serv.lotacao,
        matricula: serv.matricula,
        rotulo: `Servidor municipal · Órgão ${serv.lotacao}`,
      })
      return
    }

    if (sidAtual) {
      setServidorSemCpf(false)
      setAvisoTipo('info')
      setAviso(
        `Servidor municipal · Órgão: ${orgaoAtual || '—'} — CPF será vinculado ao cadastro deste servidor.`
      )
      return
    }

    if (vis?.servidor_id) {
      const org = vis.servidores?.lotacao || ''
      setForm((f) => ({
        ...f,
        nome: vis.nome || f.nome,
        cpf: formatCpf(vis.cpf || cpfFormatado),
        telefone: vis.telefone ? maskTelefoneBr(vis.telefone) : f.telefone,
        setor: f.setor || vis.setor || '',
      }))
      marcarServidor({
        id: vis.servidor_id,
        lotacao: org,
        matricula: vis.servidores?.matricula,
      })
      return
    }

    if (vis) {
      aplicarSugestao({
        key: `v-${vis.id}`,
        tipo: 'visitante',
        id: null,
        nome: vis.nome,
        cpf: vis.cpf,
        telefone: vis.telefone || '',
        setor: vis.setor || '',
        servidor_id: null,
        rotulo: `Já cadastrado · último setor ${vis.setor || '—'}`,
      })
      setAvisoTipo('info')
      setAviso('Dados da última visita preenchidos. Se for servidor, busque pelo nome (a lista importada quase não traz CPF).')
      return
    }

    setServidorId(null)
    setOrgao('')
    setServidorSemCpf(false)
    setSugestoes([])
    setMostrarSug(false)
    setAvisoTipo('info')
    setAviso('CPF ainda não vinculado a nenhum servidor (a lista importada quase não traz CPF). Busque pelo nome se for servidor municipal.')
  }, [])

  function onNomeChange(e) {
    const nome = e.target.value
    setCampo('nome', nome)
    setServidorId(null)
    setOrgao('')
    setServidorSemCpf(false)
    setAviso('')
    setMsgOk('')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      buscarSugestoesNome(nome).then(() => setMostrarSug(true))
    }, 300)
  }

  function onCpfChange(e) {
    const cpf = maskCpf(e.target.value)
    setCampo('cpf', cpf)
    setMsgOk('')
    if (String(cpf).replace(/\D/g, '').length === 11) {
      if (!cpfValido(cpf)) {
        setErro('CPF inválido.')
        return
      }
      setErro('')
      buscarPorCpf(cpf)
    }
  }

  async function registrar(e) {
    e.preventDefault()
    setErro('')
    setMsgOk('')

    if (!form.nome.trim() || !form.setor.trim()) {
      setErro('Preencha Nome e Setor.')
      return
    }
    const cpfDigitado = form.cpf.trim()
    if (cpfDigitado && !cpfValido(form.cpf)) {
      setErro('CPF inválido. Deixe em branco ou use o formato 000.000.000-00.')
      return
    }
    if (!telefoneBrValido(form.telefone)) {
      setErro('Telefone inválido. Use o formato (00) 00000-0000.')
      return
    }

    setSalvando(true)
    try {
      const cpfFmt = cpfDigitado ? formatCpf(form.cpf) : null
      let cpfVinculado = false

      let sid = servidorId
      if (sid && cpfFmt) {
        const { data: srv } = await supabase
          .from('servidores')
          .select('cpf')
          .eq('id', sid)
          .maybeSingle()
        if (srv && !srv.cpf) {
          const { error: upErr } = await supabase.from('servidores').update({
            cpf: cpfFmt,
            atualizado_em: new Date().toISOString(),
          }).eq('id', sid)
          if (upErr) {
            if (upErr.code === '23505') {
              const { data: porCpf } = await supabase
                .from('servidores')
                .select('id, lotacao')
                .eq('cpf', cpfFmt)
                .maybeSingle()
              if (porCpf) sid = porCpf.id
            } else {
              throw upErr
            }
          } else {
            cpfVinculado = true
          }
        }
      } else if (cpfFmt) {
        const { data: porCpf } = await supabase
          .from('servidores')
          .select('id')
          .eq('cpf', cpfFmt)
          .maybeSingle()
        if (porCpf) sid = porCpf.id
      }

      const { error } = await supabase.from('visitantes').insert({
        nome: form.nome.trim(),
        cpf: cpfFmt,
        telefone: form.telefone.trim() || null,
        setor: form.setor.trim(),
        observacao: form.observacao.trim() || null,
        foto_url: null,
        tipo: 'espontanea',
        registrado_por: perfil?.id,
        servidor_id: sid || null,
      })
      if (error) throw error

      setForm({ nome: '', cpf: '', telefone: '', setor: '', observacao: '' })
      setServidorId(null)
      setOrgao('')
      setServidorSemCpf(false)
      setAviso('')
      setMsgOk(
        cpfVinculado
          ? 'Visitante registrado. CPF vinculado ao servidor.'
          : 'Visitante registrado com sucesso.'
      )
      requestAnimationFrame(() => nomeRef.current?.focus())
      onRegistrado?.({ ficouNaTela: true })
    } catch (err) {
      const m = (err.message || '').toLowerCase()
      if (m.includes('jwt') || m.includes('session') || m.includes('not authenticated') || err.status === 401) {
        setErro('Sessão expirada. Faça login de novo.')
      } else {
        setErro(err.message || 'Erro ao registrar.')
      }
    } finally {
      setSalvando(false)
    }
  }

  function limparFormulario() {
    setForm({ nome: '', cpf: '', telefone: '', setor: '', observacao: '' })
    setServidorId(null)
    setOrgao('')
    setServidorSemCpf(false)
    setAviso('')
    setErro('')
    setMsgOk('')
    setSugestoes([])
    setMostrarSug(false)
    requestAnimationFrame(() => nomeRef.current?.focus())
  }

  const iconeAviso = avisoTipo === 'warn' ? AlertTriangle : servidorId ? BadgeCheck : Info

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="page-title text-2xl sm:text-3xl">Registrar visitante</h1>
        <p className="page-sub text-base text-gray-20 mt-1.5">
          Digite o nome (ou CPF, se tiver). O sistema identifica se é servidor municipal ou visitante externo.
        </p>
      </div>

      {erro && (
        <Alert type="error" icon={AlertTriangle}>
          {erro}
        </Alert>
      )}
      {msgOk && (
        <Alert type="success" icon={CheckCircle2}>
          {msgOk}
        </Alert>
      )}
      {aviso && (
        <Alert type={avisoTipo} icon={iconeAviso}>
          {aviso}
        </Alert>
      )}
      {servidorSemCpf && (
        <Alert type="warn" icon={AlertTriangle}>
          Servidor sem CPF no cadastro — você pode informar o CPF para vincular (opcional).
        </Alert>
      )}

      <div className="card shadow-e2">
        <form onSubmit={registrar} className="p-5 sm:p-8 space-y-5" autoComplete="off">
          <Field label="Nome completo" required>
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-5" />
              <Input
                ref={nomeRef}
                large
                value={form.nome}
                onChange={onNomeChange}
                onFocus={() => {
                  setCampoSug('nome')
                  setMostrarSug(sugestoes.length > 0)
                }}
                onBlur={() => setTimeout(() => setMostrarSug(false), 150)}
                placeholder="Digite o nome completo"
                autoFocus
                style={{ paddingLeft: 44 }}
              />
              {campoSug === 'nome' && (
                <Sugestoes itens={sugestoes} visible={mostrarSug} onPick={aplicarSugestao} />
              )}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="CPF" hint="Opcional · 000.000.000-00">
              <div className="relative">
                <Input
                  ref={cpfRef}
                  large
                  className="font-mono"
                  value={form.cpf}
                  onChange={onCpfChange}
                  onFocus={() => setCampoSug('cpf')}
                  placeholder="000.000.000-00"
                />
                {campoSug === 'cpf' && (
                  <Sugestoes itens={sugestoes} visible={mostrarSug} onPick={aplicarSugestao} />
                )}
              </div>
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

          {servidorId && (
            <Field
              label="Órgão de origem"
              hint="Preenchido automaticamente para servidores municipais."
            >
              <Input large className="font-semibold" value={orgao} readOnly />
            </Field>
          )}

          <Field label="Setor procurado" required hint="Pesquise pelo nome ou digite um setor manualmente.">
            <CampoSetorProcurado
              large
              value={form.setor}
              onChange={(v) => setCampo('setor', v)}
              setores={setores}
              inputRef={setorRef}
            />
          </Field>

          <Field label="Observação">
            <Textarea
              large
              rows={2}
              value={form.observacao}
              onChange={(e) => setCampo('observacao', e.target.value)}
              placeholder="Ex.: Liberado pela chefe de gabinete"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
            />
          </Field>

          <div className="pt-4 border-t border-gray-2 flex flex-col sm:flex-row gap-3">
            <Btn variant="outline" size="lg" onClick={limparFormulario} className="sm:flex-1">
              Limpar formulário
            </Btn>
            <button type="submit" className="btn btn-primary btn-xl sm:flex-[2]" disabled={salvando}>
              <UserPlus size={24} />
              {salvando ? 'Salvando...' : 'Registrar visitante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
