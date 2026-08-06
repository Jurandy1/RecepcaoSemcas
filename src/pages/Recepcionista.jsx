import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UserPlus, RefreshCw, Calendar, Camera, X, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C } from '../lib/theme'
import { maskCpf, maskTelefoneBr, cpfValido, telefoneBrValido, formatCpf } from '../lib/br'
import { Btn, Field, Input, Textarea, Card, Alert, Empty } from '../components/ui'
import Paginacao, { usePaginacao } from '../components/Paginacao'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function Sugestoes({ itens, onPick, visible }) {
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

function mensagemErroCamera(err) {
  const name = err?.name || ''
  if (!window.isSecureContext) {
    return 'A webcam só funciona em HTTPS ou em localhost. Abra o sistema por https:// ou http://localhost (não use IP da rede em HTTP).'
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'Este navegador não suporta webcam. Use Chrome, Edge ou Firefox atualizado.'
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Permissão da câmera negada. Clique no ícone de cadeado/câmera na barra de endereço e permita o acesso.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Nenhuma webcam encontrada. Conecte uma câmera e tente novamente.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'A webcam está em uso por outro aplicativo. Feche o outro programa e tente de novo.'
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'A webcam não aceitou as configurações pedidas. Tente novamente.'
  }
  if (name === 'SecurityError') {
    return 'O navegador bloqueou a câmera por segurança. Use HTTPS ou localhost.'
  }
  return err?.message
    ? `Não foi possível acessar a webcam: ${err.message}`
    : 'Não foi possível acessar a webcam. Verifique a permissão do navegador.'
}

async function obterStreamCamera() {
  if (!window.isSecureContext) {
    const e = new Error('INSECURE')
    e.name = 'SecurityError'
    throw e
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    const e = new Error('UNSUPPORTED')
    e.name = 'NotSupportedError'
    throw e
  }

  const tentativas = [
    { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
    { video: { facingMode: 'user' }, audio: false },
    { video: true, audio: false },
  ]

  let ultimoErro
  for (const constraints of tentativas) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      ultimoErro = err
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        throw err
      }
    }
  }
  throw ultimoErro
}

function CapturaFoto({ foto, onChange }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erroCam, setErroCam] = useState('')

  useEffect(() => {
    if (!aberto) return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    video.srcObject = stream
    const play = video.play()
    if (play?.catch) play.catch(() => {})
  }, [aberto])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  async function abrirCamera() {
    setErroCam('')
    setCarregando(true)
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      const stream = await obterStreamCamera()
      streamRef.current = stream
      setAberto(true)
    } catch (err) {
      streamRef.current = null
      setAberto(false)
      setErroCam(mensagemErroCamera(err))
    } finally {
      setCarregando(false)
    }
  }

  function pararCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setAberto(false)
  }

  function tirarFoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setErroCam('Aguarde a imagem da câmera carregar e tente novamente.')
      return
    }
    const canvas = document.createElement('canvas')
    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
    onChange(dataUrl)
    pararCamera()
  }

  return (
    <div>
      <label className="block font-semibold mb-1.5" style={{ color: C.gray80, fontSize: 15 }}>
        Foto do visitante
      </label>
      <div
        className="aspect-square border-2 flex flex-col items-center justify-center gap-2 relative overflow-hidden"
        style={{
          borderColor: foto ? C.green : aberto ? C.blue : C.gray5,
          backgroundColor: aberto ? '#0A1628' : C.gray2,
        }}
      >
        {aberto ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : foto ? (
          <img src={foto} alt="Visitante" className="w-full h-full object-cover" />
        ) : (
          <>
            <Camera size={36} style={{ color: C.gray20 }} />
            <span className="text-xs text-center px-3 font-medium" style={{ color: C.gray60 }}>
              Nenhuma foto
            </span>
          </>
        )}
        {foto && !aberto && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 p-1.5 border shadow-sm"
            style={{ color: C.red, borderColor: C.gray3, backgroundColor: C.white }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {erroCam && (
        <p className="text-xs mt-2 font-medium leading-relaxed" style={{ color: C.red }}>
          {erroCam}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {aberto ? (
          <>
            <Btn type="button" full size="sm" icon={Camera} onClick={tirarFoto}>Capturar foto</Btn>
            <Btn type="button" full size="sm" variant="ghost" onClick={pararCamera}>Cancelar câmera</Btn>
          </>
        ) : (
          <Btn
            type="button"
            full
            size="sm"
            variant="secondary"
            icon={Camera}
            onClick={abrirCamera}
            disabled={carregando}
          >
            {carregando ? 'Abrindo câmera…' : foto ? 'Tirar outra foto' : 'Abrir webcam'}
          </Btn>
        )}
      </div>
    </div>
  )
}

export function FormRegistrar({ onRegistrado }) {
  const { perfil } = useAuth()
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    setor: '',
    observacao: '',
  })
  const [foto, setFoto] = useState(null)
  const [servidorId, setServidorId] = useState(null)
  const [aviso, setAviso] = useState('')
  const [avisoTipo, setAvisoTipo] = useState('info')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [sugestoes, setSugestoes] = useState([])
  const [mostrarSug, setMostrarSug] = useState(false)
  const [campoSug, setCampoSug] = useState(null)
  const debounceRef = useRef(null)

  function setCampo(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function aplicarSugestao(item) {
    setForm((f) => ({
      ...f,
      nome: item.nome || f.nome,
      cpf: item.cpf ? formatCpf(item.cpf) : f.cpf,
      telefone: item.telefone ? maskTelefoneBr(item.telefone) : f.telefone,
      setor: item.setor || f.setor,
    }))
    setServidorId(item.tipo === 'servidor' ? item.id : null)
    if (item.tipo === 'servidor') {
      setAvisoTipo('info')
      setAviso(`Servidor municipal · ${item.setor}`)
    } else {
      setAvisoTipo('info')
      setAviso('Visitante já cadastrado anteriormente')
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
        .select('id, nome, cpf, telefone, setor, horario')
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
        id: null,
        nome: v.nome,
        cpf: v.cpf || '',
        telefone: v.telefone || '',
        setor: v.setor || '',
        rotulo: `Já cadastrado · último setor ${v.setor || '—'}`,
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

    const [{ data: serv }, { data: vis }] = await Promise.all([
      supabase
        .from('servidores')
        .select('id, nome, lotacao, cpf, matricula')
        .eq('cpf', cpfFormatado)
        .maybeSingle(),
      supabase
        .from('visitantes')
        .select('id, nome, cpf, telefone, setor, horario')
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
        rotulo: `Servidor municipal · ${serv.lotacao}`,
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
        rotulo: `Já cadastrado · último setor ${vis.setor || '—'}`,
      })
      setAvisoTipo('warn')
      setAviso('Visitante externo (não é servidor do município) — dados da última visita preenchidos.')
      return
    }

    setServidorId(null)
    setSugestoes([])
    setMostrarSug(false)
    setAvisoTipo('warn')
    setAviso('CPF não encontrado na lista de servidores do município. Cadastro como visitante externo.')
  }, [])

  function onNomeChange(e) {
    const nome = e.target.value
    setCampo('nome', nome)
    setServidorId(null)
    setAviso('')
    setCampoSug('nome')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      buscarSugestoesNome(nome).then(() => setMostrarSug(true))
    }, 300)
  }

  function onCpfChange(e) {
    const cpf = maskCpf(e.target.value)
    setCampo('cpf', cpf)
    setAviso('')
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

    if (!form.nome.trim() || !form.cpf.trim() || !form.setor.trim()) {
      setErro('Preencha Nome, CPF e Setor.')
      return
    }
    if (!cpfValido(form.cpf)) {
      setErro('Informe um CPF válido no formato 000.000.000-00.')
      return
    }
    if (!telefoneBrValido(form.telefone)) {
      setErro('Telefone inválido. Use o formato (00) 00000-0000.')
      return
    }

    setSalvando(true)
    try {
      const cpfFmt = formatCpf(form.cpf)

      let sid = servidorId
      if (sid) {
        const { data: srv } = await supabase
          .from('servidores')
          .select('cpf')
          .eq('id', sid)
          .maybeSingle()
        if (srv && !srv.cpf) {
          await supabase.from('servidores').update({
            cpf: cpfFmt,
            atualizado_em: new Date().toISOString(),
          }).eq('id', sid)
        }
      } else {
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
        foto_url: foto || null,
        tipo: 'espontanea',
        registrado_por: perfil?.id,
        servidor_id: sid || null,
      })
      if (error) throw error

      setForm({ nome: '', cpf: '', telefone: '', setor: '', observacao: '' })
      setFoto(null)
      setServidorId(null)
      setAviso('')
      onRegistrado?.()
    } catch (err) {
      setErro(err.message || 'Erro ao registrar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: C.blueDark }}>Registrar visitante</h1>
        <p className="text-base mt-1" style={{ color: C.gray60 }}>
          Digite o nome ou CPF — o sistema identifica se é servidor municipal ou visitante externo.
        </p>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}
      {aviso && <Alert type={avisoTipo}>{aviso}</Alert>}

      <Card className="p-6 sm:p-8">
        <form onSubmit={registrar} className="space-y-5" autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CapturaFoto foto={foto} onChange={setFoto} />

            <div className="md:col-span-2 space-y-5">
              <Field label="Nome completo" required>
                <div className="relative">
                  <Input
                    large
                    value={form.nome}
                    onChange={onNomeChange}
                    onFocus={() => { setCampoSug('nome'); setMostrarSug(sugestoes.length > 0) }}
                    onBlur={() => setTimeout(() => setMostrarSug(false), 150)}
                    placeholder="Digite o nome"
                    autoFocus
                  />
                  {campoSug === 'nome' && (
                    <Sugestoes itens={sugestoes} visible={mostrarSug} onPick={aplicarSugestao} />
                  )}
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="CPF" required hint="000.000.000-00">
                  <div className="relative">
                    <Input
                      large
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
                    value={form.telefone}
                    onChange={(e) => setCampo('telefone', maskTelefoneBr(e.target.value))}
                    placeholder="(98) 9xxxx-xxxx"
                  />
                </Field>
              </div>

              <Field label="Setor procurado" required>
                <Input
                  large
                  value={form.setor}
                  onChange={(e) => setCampo('setor', e.target.value)}
                  placeholder="Ex.: Gabinete, Recursos Humanos..."
                />
              </Field>

              <Field label="Observação" hint='Ex.: Liberado pela chefe de gabinete'>
                <Textarea
                  large
                  rows={2}
                  value={form.observacao}
                  onChange={(e) => setCampo('observacao', e.target.value)}
                  placeholder="Opcional"
                />
              </Field>
            </div>
          </div>

          <Btn type="submit" full size="xl" icon={UserPlus} disabled={salvando}>
            {salvando ? 'Salvando...' : 'REGISTRAR VISITANTE'}
          </Btn>
        </form>
      </Card>
    </div>
  )
}

export function ListaVisitantesHoje() {
  const { ehGestor } = useAuth()
  const [lista, setLista] = useState([])
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [busca, setBusca] = useState('')

  const filtrada = useMemo(() => {
    if (!busca.trim()) return lista
    const q = busca.trim().toLowerCase()
    return lista.filter((v) =>
      `${v.nome} ${v.cpf} ${v.setor} ${v.observacao || ''}`.toLowerCase().includes(q)
    )
  }, [lista, busca])

  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(filtrada, 10)

  async function carregar() {
    const inicio = `${hojeISO()}T00:00:00`
    const fim = `${hojeISO()}T23:59:59`
    const { data, error } = await supabase
      .from('visitantes')
      .select('*')
      .gte('horario', inicio)
      .lte('horario', fim)
      .order('horario', { ascending: false })
    if (error) setErro(error.message)
    setLista(data || [])
    reset()
  }

  useEffect(() => { carregar() }, [])

  async function excluir(v) {
    if (!ehGestor) return
    if (!confirm(`Excluir a visita de ${v.nome}?`)) return
    setErro('')
    setMsg('')
    const { error } = await supabase.from('visitantes').delete().eq('id', v.id)
    if (error) {
      setErro(error.message.includes('policy') || error.code === '42501'
        ? 'Somente administrador ou coordenadora podem excluir visitas. Rode supabase/politica-excluir-visitas.sql se ainda não rodou.'
        : error.message)
      return
    }
    setMsg('Visita excluída.')
    await carregar()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.blueDark }}>Servidores / Visitantes</h1>
          <p className="text-base mt-1" style={{ color: C.gray60 }}>
            Registros de hoje · {new Date().toLocaleDateString('pt-BR')} · {filtrada.length}
          </p>
        </div>
        <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <Input
        large
        value={busca}
        onChange={(e) => { setBusca(e.target.value); irPara(1) }}
        placeholder="Buscar por nome, CPF ou setor..."
      />

      <Card>
        {itens.length === 0 ? (
          <Empty>Nenhum registro hoje.</Empty>
        ) : (
          <div>
            {itens.map((v) => (
              <div key={v.id} className="px-5 py-4 border-t flex flex-col sm:flex-row sm:items-center gap-3 justify-between" style={{ borderColor: C.gray3 }}>
                <div className="flex items-start gap-3 min-w-0">
                  {v.foto_url ? (
                    <img src={v.foto_url} alt="" className="w-12 h-12 object-cover flex-shrink-0 border" style={{ borderColor: C.gray3 }} />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ backgroundColor: C.blue }}>
                      {v.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-lg font-semibold" style={{ color: C.blueDark }}>{v.nome}</div>
                    <div className="text-sm" style={{ color: C.gray60 }}>
                      {v.setor} · CPF {v.cpf}
                      {v.telefone ? ` · ${v.telefone}` : ''}
                      {v.servidor_id ? ' · Servidor municipal' : ' · Visitante'}
                      {v.tipo === 'agendada' ? ' · Agendada' : ''}
                    </div>
                    {v.observacao && (
                      <div className="text-sm mt-1" style={{ color: C.blueDark }}>Obs.: {v.observacao}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-base font-mono" style={{ color: C.gray80 }}>
                    {new Date(v.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {ehGestor && (
                    <Btn variant="danger" size="sm" icon={Trash2} onClick={() => excluir(v)}>
                      Excluir
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <Paginacao
          pagina={pagina}
          totalPaginas={totalPaginas}
          totalItens={filtrada.length}
          onChange={irPara}
        />
      </Card>
    </div>
  )
}

export function AgendaDia() {
  const { perfil } = useAuth()
  const [agendamentos, setAgendamentos] = useState([])
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(agendamentos, 10)

  async function carregar() {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('data', hojeISO())
      .neq('status', 'cancelado')
      .order('hora', { ascending: true })
    if (error) setErro(error.message)
    setAgendamentos(data || [])
    reset()
  }

  useEffect(() => { carregar() }, [])

  async function marcarChegou(ag) {
    setErro('')
    try {
      await supabase.from('agendamentos').update({ status: 'chegou' }).eq('id', ag.id)
      const cpf = ag.cpf && cpfValido(ag.cpf) ? formatCpf(ag.cpf) : (ag.cpf || '000.000.000-00')
      const { error } = await supabase.from('visitantes').insert({
        nome: ag.nome_visitante,
        cpf,
        telefone: ag.telefone,
        setor: ag.setor,
        tipo: 'agendada',
        agendamento_id: ag.id,
        registrado_por: perfil?.id,
        observacao: ag.observacao || null,
      })
      if (error) throw error
      setMsg(`${ag.nome_visitante} registrado(a) na chegada.`)
      await carregar()
    } catch (err) {
      setErro(err.message || 'Erro ao registrar chegada.')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.blueDark }}>Agenda do dia</h1>
          <p className="text-base mt-1" style={{ color: C.gray60 }}>
            Visitas agendadas — {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <Card>
        {itens.length === 0 ? (
          <Empty>Nenhum agendamento para hoje.</Empty>
        ) : (
          itens.map((a) => (
            <div key={a.id} className="px-5 py-5 border-b flex flex-col sm:flex-row sm:items-center gap-4" style={{ borderColor: C.gray3 }}>
              <div className="flex-1">
                <div className="text-xl font-bold" style={{ color: C.blueDark }}>{a.nome_visitante}</div>
                <div className="text-base mt-1" style={{ color: C.gray60 }}>
                  {String(a.hora).slice(0, 5)} · Setor: <strong>{a.setor}</strong>
                  {a.sala ? ` · Sala ${a.sala}` : ''}
                </div>
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
          ))
        )}
        <Paginacao pagina={pagina} totalPaginas={totalPaginas} totalItens={agendamentos.length} onChange={irPara} />
      </Card>
    </div>
  )
}

export default function Recepcionista({ pagina, onRegistrado }) {
  if (pagina === 'agenda') return <AgendaDia />
  if (pagina === 'visitantes') return <ListaVisitantesHoje />
  return <FormRegistrar onRegistrado={onRegistrado} />
}
