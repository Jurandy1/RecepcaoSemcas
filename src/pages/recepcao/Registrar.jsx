import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Info,
  Landmark,
  Search,
  User,
  UserPlus,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { maskCpf, maskTelefoneBr, cpfValido, telefoneBrValido, formatCpf } from '../../lib/br'
import { salvarFotoVisitante } from '../../lib/fotos'
import {
  Alert,
  BadgeOrigem,
  Btn,
  Field,
  FotoAmpliavel,
  Input,
  Textarea,
} from '../../components/ui'
import { useSetoresAtivos, CampoSetorProcurado } from '../../components/setores'

/** Se true, exige foto no registro (balcão SEMCAS). */
const FOTO_OBRIGATORIA = false

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

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

  const moldura = foto
    ? 'border-success'
    : aberto
      ? 'border-blue'
      : 'border-dashed border-gray-3'

  return (
    <div>
      <span className="field-label">Foto do visitante</span>
      <div
        className={`aspect-square border-2 rounded-lg flex flex-col items-center justify-center gap-2 relative overflow-hidden ${moldura}`}
        style={{ backgroundColor: aberto ? '#071D41' : '#F8F8F8' }}
      >
        {aberto ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : foto ? (
          <FotoAmpliavel
            src={foto}
            alt="Visitante"
            className="w-full h-full absolute inset-0 border-0 rounded-none"
          />
        ) : (
          <>
            <Camera size={40} className="text-gray-5" />
            <span className="text-sm text-center px-3 font-semibold text-gray-60">Nenhuma foto</span>
            <span className="text-xs text-center px-3 text-gray-20">
              Clique em abrir para capturar
            </span>
          </>
        )}
        {foto && !aberto && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(null)
            }}
            className="absolute top-2 right-2 p-1.5 rounded border border-gray-3 bg-white text-danger shadow-e1 z-10"
            aria-label="Remover foto"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {aberto ? (
          <>
            <Btn full size="md" icon={Camera} onClick={tirarFoto}>
              Capturar foto
            </Btn>
            <Btn full size="sm" variant="ghost" onClick={pararCamera}>
              Cancelar câmera
            </Btn>
          </>
        ) : (
          <Btn
            full
            size="md"
            variant="secondary"
            icon={Camera}
            onClick={abrirCamera}
            disabled={carregando}
          >
            {carregando ? 'Abrindo câmera…' : foto ? 'Tirar outra foto' : 'Abrir webcam'}
          </Btn>
        )}
      </div>

      {erroCam ? (
        <p className="field-hint text-danger-dark font-medium">{erroCam}</p>
      ) : (
        <p className="field-hint">Funciona em HTTPS ou localhost.</p>
      )}
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

  function limparFormulario() {
    setForm({ nome: '', cpf: '', telefone: '', setor: '', observacao: '' })
    setFoto(null)
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="page-title text-2xl sm:text-3xl">Registrar visitante</h1>
        <p className="page-sub text-base text-gray-20 mt-1.5">
          Digite o nome ou CPF. O sistema identifica se é servidor municipal ou visitante externo.
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
          Servidor sem CPF no cadastro — digite o CPF para vincular.
        </Alert>
      )}

      <div className="card shadow-e2">
        <form onSubmit={registrar} className="p-5 sm:p-8" autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,240px)_1fr] gap-6 sm:gap-8">
            <CapturaFoto foto={foto} onChange={setFoto} />

            <div className="space-y-5">
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
                <Field label="CPF" required hint="000.000.000-00">
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

              <Field label="Setor procurado" required hint="Escolha da lista ou use Outro para digitar.">
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
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-2 flex flex-col sm:flex-row gap-3">
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
