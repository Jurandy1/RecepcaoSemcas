import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UserPlus, RefreshCw, Calendar, Camera, X, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C } from '../lib/theme'
import { maskCpf, maskCpfExibicao, maskTelefoneBr, cpfValido, telefoneBrValido, formatCpf } from '../lib/br'
import { salvarFotoVisitante } from '../lib/fotos'
import { Btn, Field, Input, Textarea, Card, Alert, Empty, FotoAmpliavel } from '../components/ui'
import Paginacao, { usePaginacao } from '../components/Paginacao'
import { useSetoresAtivos, CampoSetorProcurado } from './SetoresProcurados'

/** Se true, exige foto no registro (balcão SEMCAS). */
const FOTO_OBRIGATORIA = false

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
          <FotoAmpliavel
            src={foto}
            alt="Visitante"
            className="w-full h-full absolute inset-0"
            style={{ border: 'none' }}
          />
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
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="absolute top-2 right-2 p-1.5 border shadow-sm z-10"
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
  const { setores } = useSetoresAtivos()
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    setor: '',
    observacao: '',
  })
  const [foto, setFoto] = useState(null)
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

  function focarProximoCampo({ nome, cpf, setor }) {
    requestAnimationFrame(() => {
      const cpfOk = cpf && String(cpf).replace(/\D/g, '').length === 11 && cpfValido(cpf)
      if (!cpfOk) {
        cpfRef.current?.focus()
        return
      }
      if (!setor?.trim()) {
        setorRef.current?.focus()
        return
      }
      nomeRef.current?.focus()
    })
  }

  async function carregarFotoAnterior({ cpf, nome, servidorId: sid }) {
    let query = supabase
      .from('visitantes')
      .select('foto_url')
      .not('foto_url', 'is', null)
      .order('horario', { ascending: false })
      .limit(1)

    if (cpf && String(cpf).replace(/\D/g, '').length === 11) {
      query = query.eq('cpf', formatCpf(cpf))
    } else if (sid) {
      query = query.eq('servidor_id', sid)
    } else if (nome?.trim()) {
      query = query.ilike('nome', nome.trim())
    } else {
      return
    }

    const { data } = await query.maybeSingle()
    if (data?.foto_url) setFoto(data.foto_url)
  }

  function marcarServidor(s, { semCpf = false } = {}) {
    setServidorId(s.id)
    setOrgao(s.lotacao || s.setor || '')
    setServidorSemCpf(semCpf)
    setAvisoTipo('info')
    if (semCpf) {
      setAviso(`Servidor municipal · Órgão: ${s.lotacao || s.setor || '—'} — sem CPF no cadastro. Digite o CPF para vincular.`)
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
      carregarFotoAnterior({
        cpf: item.cpf,
        nome: item.nome,
        servidorId: item.id,
      })
      focarProximoCampo({
        nome: item.nome,
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
      if (item.foto_url) setFoto(item.foto_url)
      else {
        carregarFotoAnterior({
          cpf: item.cpf,
          nome: item.nome,
          servidorId: item.servidor_id,
        })
      }
      focarProximoCampo({
        nome: item.nome,
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
        .select('id, nome, cpf, telefone, setor, horario, foto_url, servidor_id, servidores(lotacao, matricula)')
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
        foto_url: v.foto_url || null,
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
        .select('id, nome, cpf, telefone, setor, horario, foto_url, servidor_id, servidores(lotacao, matricula)')
        .eq('cpf', cpfFormatado)
        .order('horario', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    // CPF já está no cadastro de servidores
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

    // Já havia selecionado um servidor (ex.: sem CPF) — NÃO desmarcar
    if (sidAtual) {
      setServidorSemCpf(false)
      setAvisoTipo('info')
      setAviso(
        `Servidor municipal · Órgão: ${orgaoAtual || '—'} — CPF será vinculado ao cadastro deste servidor.`
      )
      await carregarFotoAnterior({ cpf: cpfFormatado, servidorId: sidAtual })
      return
    }

    // Visita anterior com vínculo a servidor
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
      if (vis.foto_url) setFoto(vis.foto_url)
      else await carregarFotoAnterior({ cpf: cpfFormatado, servidorId: vis.servidor_id })
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
        foto_url: vis.foto_url || null,
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
    setCampoSug('nome')
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
    if (FOTO_OBRIGATORIA && !foto) {
      setErro('A foto do visitante é obrigatória neste balcão.')
      return
    }

    setSalvando(true)
    try {
      const cpfFmt = formatCpf(form.cpf)
      let cpfVinculado = false

      let sid = servidorId
      if (sid) {
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
      } else {
        const { data: porCpf } = await supabase
          .from('servidores')
          .select('id')
          .eq('cpf', cpfFmt)
          .maybeSingle()
        if (porCpf) sid = porCpf.id
      }

      const fotoUrl = await salvarFotoVisitante(foto, cpfFmt)

      const { error } = await supabase.from('visitantes').insert({
        nome: form.nome.trim(),
        cpf: cpfFmt,
        telefone: form.telefone.trim() || null,
        setor: form.setor.trim(),
        observacao: form.observacao.trim() || null,
        foto_url: fotoUrl || null,
        tipo: 'espontanea',
        registrado_por: perfil?.id,
        servidor_id: sid || null,
      })
      if (error) throw error

      setForm({ nome: '', cpf: '', telefone: '', setor: '', observacao: '' })
      setFoto(null)
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
      // Mantém no balcão de registro; lista pode ser aberta pelo menu
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: C.blueDark }}>Registrar visitante</h1>
        <p className="text-base mt-1" style={{ color: C.gray60 }}>
          Digite o nome ou CPF — o sistema identifica se é servidor municipal ou visitante externo.
          {!window.isSecureContext && (
            <span style={{ color: C.orange }}> · Webcam: use localhost ou HTTPS.</span>
          )}
        </p>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}
      {msgOk && <Alert type="success">{msgOk}</Alert>}
      {aviso && <Alert type={avisoTipo}>{aviso}</Alert>}
      {servidorSemCpf && (
        <Alert type="warn">Servidor sem CPF no cadastro — digite o CPF para vincular.</Alert>
      )}

      <Card className="p-6 sm:p-8">
        <form onSubmit={registrar} className="space-y-5" autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CapturaFoto foto={foto} onChange={setFoto} />

            <div className="md:col-span-2 space-y-5">
              <Field label="Nome completo" required>
                <div className="relative">
                  <Input
                    ref={nomeRef}
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
                      ref={cpfRef}
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

              {servidorId && (
                <Field label="Órgão (servidor municipal)">
                  <Input large value={orgao} readOnly style={{ backgroundColor: C.blueBg, fontWeight: 600 }} />
                </Field>
              )}

              <Field label="Setor procurado" required hint="Escolha da lista ou use Outro para digitar">
                <CampoSetorProcurado
                  large
                  value={form.setor}
                  onChange={(v) => setCampo('setor', v)}
                  setores={setores}
                  inputRef={setorRef}
                />
              </Field>

              <Field label="Observação" hint='Ex.: Liberado pela chefe de gabinete'>
                <Textarea
                  large
                  rows={2}
                  value={form.observacao}
                  onChange={(e) => setCampo('observacao', e.target.value)}
                  placeholder="Opcional"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      e.currentTarget.form?.requestSubmit()
                    }
                  }}
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
  const [filtro, setFiltro] = useState('todos') // todos | servidores | externos | agendados

  const filtrada = useMemo(() => {
    let base = lista
    if (filtro === 'servidores') base = base.filter((v) => v.servidor_id)
    else if (filtro === 'externos') base = base.filter((v) => !v.servidor_id)
    else if (filtro === 'agendados') base = base.filter((v) => v.tipo === 'agendada')

    if (!busca.trim()) return base
    const q = busca.trim().toLowerCase()
    return base.filter((v) =>
      `${v.nome} ${v.cpf} ${v.setor} ${v.telefone || ''} ${v.observacao || ''} ${v.servidores?.lotacao || ''}`.toLowerCase().includes(q)
    )
  }, [lista, busca, filtro])

  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(filtrada, 8)

  async function carregar() {
    const inicio = `${hojeISO()}T00:00:00`
    const fim = `${hojeISO()}T23:59:59`
    const { data, error } = await supabase
      .from('visitantes')
      .select('*, servidores(lotacao, matricula)')
      .gte('horario', inicio)
      .lte('horario', fim)
      .order('horario', { ascending: false })
    if (error) {
      const r2 = await supabase
        .from('visitantes')
        .select('*')
        .gte('horario', inicio)
        .lte('horario', fim)
        .order('horario', { ascending: false })
      if (r2.error) setErro(r2.error.message)
      setLista(r2.data || [])
    } else {
      setLista(data || [])
    }
    reset()
  }

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    const id = setInterval(() => { carregar() }, 30000)
    return () => clearInterval(id)
  }, [])

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

  const chips = [
    { id: 'todos', label: 'Todos' },
    { id: 'servidores', label: 'Servidores' },
    { id: 'externos', label: 'Externos' },
    { id: 'agendados', label: 'Agendados' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.blueDark }}>Servidores / Visitantes</h1>
          <p className="text-base mt-1" style={{ color: C.gray60 }}>
            Registros de hoje · {new Date().toLocaleDateString('pt-BR')} · {filtrada.length}
            <span className="text-xs ml-2" style={{ color: C.gray20 }}>atualiza a cada 30s</span>
          </p>
        </div>
        <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => { setFiltro(c.id); irPara(1) }}
            className="px-3 py-2 text-sm font-semibold border"
            style={{
              backgroundColor: filtro === c.id ? C.blue : C.white,
              color: filtro === c.id ? C.white : C.blueDark,
              borderColor: filtro === c.id ? C.blue : C.gray3,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Input
        large
        value={busca}
        onChange={(e) => { setBusca(e.target.value); irPara(1) }}
        placeholder="Buscar por nome, CPF, telefone, setor ou órgão..."
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
                    <FotoAmpliavel
                      src={v.foto_url}
                      alt={v.nome}
                      className="w-12 h-12"
                      size={48}
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ backgroundColor: C.blue }}>
                      {v.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-lg font-semibold" style={{ color: C.blueDark }}>{v.nome}</div>
                    <div className="text-sm" style={{ color: C.gray60 }}>
                      {v.setor} · CPF {maskCpfExibicao(v.cpf)}
                      {v.telefone ? ` · ${v.telefone}` : ''}
                      {v.tipo === 'agendada' ? ' · Agendada' : ''}
                    </div>
                    {v.servidor_id ? (
                      <div className="text-sm mt-1 font-semibold" style={{ color: C.blue }}>
                        Servidor municipal · Órgão {v.servidores?.lotacao || '—'}
                      </div>
                    ) : (
                      <div className="text-sm mt-1" style={{ color: C.gray20 }}>Visitante externo</div>
                    )}
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
  const [chegandoId, setChegandoId] = useState(null)
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
    if (chegandoId) return
    setErro('')
    setChegandoId(ag.id)
    try {
      await supabase.from('agendamentos').update({ status: 'chegou' }).eq('id', ag.id)
      const cpf = ag.cpf && cpfValido(ag.cpf) ? formatCpf(ag.cpf) : (ag.cpf || '000.000.000-00')

      let fotoAnterior = null
      if (ag.cpf && cpfValido(ag.cpf)) {
        const { data: ant } = await supabase
          .from('visitantes')
          .select('foto_url')
          .eq('cpf', formatCpf(ag.cpf))
          .not('foto_url', 'is', null)
          .order('horario', { ascending: false })
          .limit(1)
          .maybeSingle()
        fotoAnterior = ant?.foto_url || null
      }

      const { error } = await supabase.from('visitantes').insert({
        nome: ag.nome_visitante,
        cpf,
        telefone: ag.telefone,
        setor: ag.setor,
        tipo: 'agendada',
        agendamento_id: ag.id,
        registrado_por: perfil?.id,
        observacao: ag.observacao || null,
        foto_url: fotoAnterior,
      })
      if (error) throw error
      setMsg(`${ag.nome_visitante} registrado(a) na chegada.`)
      await carregar()
    } catch (err) {
      const m = (err.message || '').toLowerCase()
      if (m.includes('jwt') || m.includes('session') || m.includes('not authenticated')) {
        setErro('Sessão expirada. Faça login de novo.')
      } else {
        setErro(err.message || 'Erro ao registrar chegada.')
      }
    } finally {
      setChegandoId(null)
    }
  }

  const pendentes = agendamentos.filter((a) => a.status === 'agendado').length
  const chegaram = agendamentos.filter((a) => a.status === 'chegou').length

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.blueDark }}>Agenda do dia</h1>
          <p className="text-base mt-1" style={{ color: C.gray60 }}>
            Visitas agendadas — {new Date().toLocaleDateString('pt-BR')}
            {' · '}
            <span style={{ color: C.orange }}>{pendentes} aguardando</span>
            {' · '}
            <span style={{ color: C.green }}>{chegaram} chegaram</span>
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
            <div
              key={a.id}
              className="px-5 py-5 border-b flex flex-col sm:flex-row sm:items-center gap-4"
              style={{
                borderColor: C.gray3,
                backgroundColor: a.status === 'chegou' ? C.greenBg : a.status === 'agendado' ? C.orangeBg : C.card,
              }}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xl font-bold" style={{ color: C.blueDark }}>{a.nome_visitante}</div>
                  {a.status === 'agendado' && (
                    <span className="text-xs font-bold px-2 py-1" style={{ backgroundColor: C.orange, color: C.white }}>
                      AGUARDANDO
                    </span>
                  )}
                  {a.status === 'chegou' && (
                    <span className="text-xs font-bold px-2 py-1" style={{ backgroundColor: C.green, color: C.white }}>
                      CHEGOU
                    </span>
                  )}
                </div>
                <div className="text-base mt-1" style={{ color: C.gray60 }}>
                  {String(a.hora).slice(0, 5)} · Setor: <strong>{a.setor}</strong>
                  {a.sala ? ` · Sala ${a.sala}` : ''}
                </div>
              </div>
              {a.status === 'chegou' ? (
                <span className="text-base font-semibold px-3 py-2" style={{ backgroundColor: C.white, color: C.green }}>
                  Já chegou
                </span>
              ) : (
                <Btn
                  size="lg"
                  icon={UserPlus}
                  onClick={() => marcarChegou(a)}
                  disabled={chegandoId === a.id}
                >
                  {chegandoId === a.id ? 'Registrando...' : 'Chegou — registrar'}
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
