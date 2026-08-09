import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Landmark,
  RefreshCw,
  Search,
  Trash2,
  User,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { maskCpfExibicao } from '../../lib/br'
import {
  Alert,
  Avatar,
  BadgeOrigem,
  Btn,
  Chip,
  Empty,
  FotoAmpliavel,
  Input,
  Segmented,
} from '../../components/ui'
import Paginacao, { usePaginacao } from '../../components/ui/Paginacao'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function EntradasHoje() {
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
        ? 'Somente administrador ou coordenadora podem excluir visitas. Rode supabase/patches/politica-excluir-visitas.sql se ainda não rodou.'
        : error.message)
      return
    }
    setMsg('Visita excluída.')
    await carregar()
  }

  const contadores = useMemo(
    () => ({
      todos: lista.length,
      servidores: lista.filter((v) => v.servidor_id).length,
      externos: lista.filter((v) => !v.servidor_id).length,
      agendados: lista.filter((v) => v.tipo === 'agendada').length,
    }),
    [lista]
  )

  const opcoesFiltro = [
    { value: 'todos', label: 'Todos', contador: contadores.todos },
    { value: 'servidores', label: 'Servidores', contador: contadores.servidores },
    { value: 'externos', label: 'Visitantes', contador: contadores.externos },
    { value: 'agendados', label: 'Agendados', contador: contadores.agendados },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl">Entradas de hoje</h1>
          <p className="page-sub text-sm text-gray-20 mt-1.5 flex items-center gap-2 flex-wrap">
            <span>
              {new Date().toLocaleDateString('pt-BR')} ·{' '}
              <strong className="text-blue-dark">
                {filtrada.length} {filtrada.length === 1 ? 'registro' : 'registros'}
              </strong>
            </span>
            <Chip tone="success" dot xs>
              Atualiza a cada 30s
            </Chip>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <Segmented
          className="flex-shrink-0 self-start max-w-full overflow-x-auto"
          valor={filtro}
          onChange={(v) => {
            setFiltro(v)
            irPara(1)
          }}
          opcoes={opcoesFiltro}
        />
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-5" />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              irPara(1)
            }}
            placeholder="Buscar por nome, CPF, telefone, setor ou órgão..."
            style={{ paddingLeft: 44 }}
          />
        </div>
      </div>

      <div className="card">
        {itens.length === 0 ? (
          <Empty icon={ClipboardList}>Nenhum registro encontrado para este filtro.</Empty>
        ) : (
          <div className="divide-y divide-gray-2">
            {itens.map((v) => (
              <div
                key={v.id}
                className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {v.foto_url ? (
                    <FotoAmpliavel src={v.foto_url} alt={v.nome} size={48} />
                  ) : (
                    <Avatar nome={v.nome} size={48} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-base font-semibold text-blue-dark">{v.nome}</div>
                      <BadgeOrigem servidor={Boolean(v.servidor_id)}>
                        {v.servidor_id ? (
                          <>
                            <Landmark size={12} />
                            Servidor
                          </>
                        ) : (
                          <>
                            <User size={12} />
                            Visitante
                          </>
                        )}
                      </BadgeOrigem>
                      {v.tipo === 'agendada' && (
                        <Chip tone="warn" icon={CalendarCheck} xs>
                          Agendado
                        </Chip>
                      )}
                    </div>
                    <div className="text-sm text-gray-20 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      {v.servidor_id && v.servidores?.lotacao && <span>{v.servidores.lotacao}</span>}
                      <span className="inline-flex items-center gap-1">
                        <ArrowRight size={14} />
                        {v.setor}
                      </span>
                      <span className="font-mono text-xs">CPF {maskCpfExibicao(v.cpf)}</span>
                      {v.telefone && <span className="font-mono text-xs">{v.telefone}</span>}
                    </div>
                    {v.observacao && (
                      <div className="text-sm text-blue-dark mt-1.5 italic">“{v.observacao}”</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 justify-between sm:justify-end">
                  <div className="text-lg font-mono font-semibold text-blue-dark">
                    {new Date(v.horario).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {ehGestor && (
                    <Btn
                      variant="dangerGhost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => excluir(v)}
                      title="Excluir registro de entrada"
                    >
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
      </div>
    </div>
  )
}
