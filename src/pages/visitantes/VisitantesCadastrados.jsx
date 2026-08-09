import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarCheck,
  ChevronRight,
  ContactRound,
  RefreshCw,
  Search,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { maskCpfExibicao } from '../../lib/br'
import { Alert, Avatar, Btn, Chip, Empty, FotoAmpliavel, Input } from '../../components/ui'
import Paginacao, { usePaginacao } from '../../components/ui/Paginacao'

function partesDataHora(iso) {
  if (!iso) return { data: '—', hora: '—' }
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('pt-BR'),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

function tituloDia(iso) {
  const d = new Date(iso)
  const completo = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const semana = d.toLocaleDateString('pt-BR', { weekday: 'long' })
  return `${completo} · ${semana}`
}

function Retrato({ pessoa, size = 56 }) {
  if (pessoa.foto_url) {
    return <FotoAmpliavel src={pessoa.foto_url} alt={pessoa.nome || 'Foto'} size={size} />
  }
  return <Avatar nome={pessoa.nome} size={size} />
}

function HistoricoVisitante({ pessoa, onVoltar }) {
  const [visitas, setVisitas] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const { pagina, totalPaginas, itens, irPara } = usePaginacao(visitas, 12)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setCarregando(true)
      setErro('')
      const { data, error } = await supabase
        .from('visitantes')
        .select('id, nome, cpf, setor, observacao, horario, tipo, telefone, foto_url')
        .eq('cpf', pessoa.cpf)
        .order('horario', { ascending: false })
      if (!ativo) return
      if (error) setErro(error.message)
      setVisitas(data || [])
      setCarregando(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [pessoa.cpf])

  const porDia = useMemo(() => {
    const grupos = []
    let diaAtual = null
    for (const v of itens) {
      const { data, hora } = partesDataHora(v.horario)
      if (data !== diaAtual) {
        diaAtual = data
        grupos.push({ data, titulo: tituloDia(v.horario), itens: [] })
      }
      grupos[grupos.length - 1].itens.push({ ...v, hora })
    }
    return grupos
  }, [itens])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      <Btn variant="ghost" size="sm" icon={ArrowLeft} onClick={onVoltar}>
        Voltar para a lista
      </Btn>

      <div className="card shadow-e2">
        <div className="card-topbar" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            <Retrato pessoa={pessoa} size={80} />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-blue-dark">
                {pessoa.nome}
              </h1>
              <div className="text-sm text-gray-20 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono">CPF {maskCpfExibicao(pessoa.cpf)}</span>
                {pessoa.telefone && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{pessoa.telefone}</span>
                  </>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip tone="outline">
                  {pessoa.total} {pessoa.total === 1 ? 'visita registrada' : 'visitas registradas'}
                </Chip>
                {pessoa.ultimoSetor && <Chip tone="blue">Último setor: {pessoa.ultimoSetor}</Chip>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-60 uppercase tracking-wider">
          Histórico de atendimentos
        </h2>
        <p className="text-sm mt-1 text-gray-20">Dias e setores em que a pessoa foi atendida</p>
      </div>

      {erro && (
        <Alert type="error" icon={AlertTriangle}>
          {erro}
        </Alert>
      )}

      <div className="card">
        {carregando ? (
          <Empty>Carregando histórico...</Empty>
        ) : visitas.length === 0 ? (
          <Empty icon={Calendar}>Nenhuma visita encontrada.</Empty>
        ) : (
          <>
            {porDia.map((grupo) => (
              <div key={grupo.data}>
                <div className="px-4 sm:px-5 py-2.5 text-xs font-bold bg-gray-1 text-blue-dark uppercase tracking-wider border-y border-gray-2 flex items-center gap-1.5">
                  <Calendar size={14} />
                  {grupo.titulo}
                </div>
                {grupo.itens.map((v) => (
                  <div
                    key={v.id}
                    className="px-4 sm:px-5 py-4 border-b border-gray-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-blue-dark">{v.setor}</div>
                      <div className="text-sm text-gray-20 mt-0.5">
                        {v.tipo === 'agendada' ? (
                          <Chip tone="warn" icon={CalendarCheck} xs>
                            Agendada
                          </Chip>
                        ) : (
                          'Visita espontânea'
                        )}
                      </div>
                      {v.observacao && (
                        <div className="text-sm text-blue-dark mt-1 italic">“{v.observacao}”</div>
                      )}
                    </div>
                    <div className="text-base font-mono font-semibold text-gray-60 flex-shrink-0">
                      {v.hora}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <Paginacao
              pagina={pagina}
              totalPaginas={totalPaginas}
              totalItens={visitas.length}
              onChange={irPara}
              rotulo="visita"
            />
          </>
        )}
      </div>
    </div>
  )
}

export default function VisitantesCadastrados() {
  const [pessoas, setPessoas] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState(null)

  const filtrada = useMemo(() => {
    if (!busca.trim()) return pessoas
    const q = busca.trim().toLowerCase().replace(/\D/g, '')
    const qTexto = busca.trim().toLowerCase()
    return pessoas.filter((p) => {
      const cpfDigits = (p.cpf || '').replace(/\D/g, '')
      return (
        (p.nome || '').toLowerCase().includes(qTexto)
        || (p.cpf || '').toLowerCase().includes(qTexto)
        || (q && cpfDigits.includes(q))
      )
    })
  }, [pessoas, busca])

  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(filtrada, 10)

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      // Busca em lotes (Supabase limita ~1000 por request)
      const lote = 1000
      let from = 0
      const todas = []
      for (;;) {
        const { data, error } = await supabase
          .from('visitantes')
          .select('id, nome, cpf, telefone, setor, foto_url, horario')
          .order('horario', { ascending: false })
          .range(from, from + lote - 1)
        if (error) throw error
        const rows = data || []
        todas.push(...rows)
        if (rows.length < lote) break
        from += lote
        if (from > 20000) break
      }

      const map = new Map()
      for (const v of todas) {
        if (!v.cpf) continue
        const atual = map.get(v.cpf)
        if (!atual) {
          map.set(v.cpf, {
            cpf: v.cpf,
            nome: v.nome,
            telefone: v.telefone,
            foto_url: v.foto_url,
            ultimaVisita: v.horario,
            ultimoSetor: v.setor,
            total: 1,
          })
        } else {
          atual.total += 1
          if (!atual.foto_url && v.foto_url) atual.foto_url = v.foto_url
          if (!atual.telefone && v.telefone) atual.telefone = v.telefone
        }
      }

      const lista = Array.from(map.values()).sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
      )
      setPessoas(lista)
      reset()
    } catch (err) {
      setErro(err.message || 'Erro ao carregar visitantes.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  if (selecionado) {
    return <HistoricoVisitante pessoa={selecionado} onVoltar={() => setSelecionado(null)} />
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl">Visitantes cadastrados</h1>
          <p className="page-sub text-sm text-gray-20 mt-1.5">
            Pessoas únicas por CPF
            {!carregando && (
              <>
                {' · '}
                <strong className="text-blue-dark">
                  {filtrada.length} {filtrada.length === 1 ? 'pessoa' : 'pessoas'}
                </strong>
              </>
            )}
            {' · clique no nome para ver o histórico'}
          </p>
        </div>
        <Btn variant="outline" icon={RefreshCw} onClick={carregar} disabled={carregando}>
          Atualizar
        </Btn>
      </div>

      {erro && (
        <Alert type="error" icon={AlertTriangle}>
          {erro}
        </Alert>
      )}

      <div className="relative">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-5" />
        <Input
          large
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            irPara(1)
          }}
          placeholder="Buscar por nome ou CPF..."
          style={{ paddingLeft: 44 }}
        />
      </div>

      <div className="card">
        {carregando ? (
          <Empty>Carregando visitantes...</Empty>
        ) : itens.length === 0 ? (
          <Empty icon={ContactRound}>
            {busca.trim() ? 'Nenhuma pessoa encontrada para essa busca.' : 'Nenhum visitante cadastrado.'}
          </Empty>
        ) : (
          <>
            <div className="divide-y divide-gray-2">
              {itens.map((p) => {
                const { data, hora } = partesDataHora(p.ultimaVisita)
                return (
                  <button
                    key={p.cpf}
                    type="button"
                    onClick={() => setSelecionado(p)}
                    title="Ver histórico de visitas"
                    className="w-full text-left px-4 sm:px-5 py-4 flex items-center gap-4 hover:bg-blue-10 transition-colors"
                  >
                    <Retrato pessoa={p} size={56} />
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-blue-dark truncate">{p.nome}</div>
                      <div className="text-sm text-gray-20 mt-0.5 font-mono">
                        CPF {maskCpfExibicao(p.cpf)}
                      </div>
                      <div className="text-xs text-gray-20 mt-1 flex flex-wrap items-center gap-x-2">
                        <span>
                          <strong className="text-blue-dark">{p.total}</strong>{' '}
                          {p.total === 1 ? 'visita' : 'visitas'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Última: <strong>{data} {hora}</strong>
                        </span>
                        {p.ultimoSetor && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{p.ultimoSetor}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-5 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
            <Paginacao
              pagina={pagina}
              totalPaginas={totalPaginas}
              totalItens={filtrada.length}
              onChange={irPara}
              rotulo="pessoa"
            />
          </>
        )}
      </div>
    </div>
  )
}
