import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Landmark,
  RefreshCw,
  User,
  UserPlus,
  Users,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Avatar, BadgeOrigem, Btn, Chip, Empty, FotoAmpliavel } from '../../components/ui'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function horaCurta(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function PainelGestor({ onNav }) {
  const [dados, setDados] = useState({
    entradas: 0,
    aguardando: [],
    chegaram: [],
    usuarios: 0,
    ultimas: [],
  })
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const dia = hojeISO()
    const inicio = `${dia}T00:00:00`
    const fim = `${dia}T23:59:59`

    const [entradas, agenda, usuarios, ultimas] = await Promise.all([
      supabase
        .from('visitantes')
        .select('id', { count: 'exact', head: true })
        .gte('horario', inicio)
        .lte('horario', fim),
      supabase
        .from('agendamentos')
        .select('*')
        .eq('data', dia)
        .neq('status', 'cancelado')
        .order('hora'),
      supabase.from('perfis').select('id', { count: 'exact', head: true }).eq('ativo', true),
      supabase
        .from('visitantes')
        .select('id, nome, setor, horario, tipo, servidor_id, foto_url, servidores(lotacao)')
        .gte('horario', inicio)
        .lte('horario', fim)
        .order('horario', { ascending: false })
        .limit(5),
    ])

    const lista = agenda.data || []
    setDados({
      entradas: entradas.count || 0,
      aguardando: lista.filter((a) => a.status === 'agendado'),
      chegaram: lista.filter((a) => a.status === 'chegou'),
      usuarios: usuarios.count || 0,
      ultimas: ultimas.data || [],
    })
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    const id = setInterval(carregar, 30000)
    return () => clearInterval(id)
  }, [carregar])

  const totalAgenda = dados.aguardando.length + dados.chegaram.length

  const metricas = [
    {
      rotulo: 'Aguardando chegada',
      valor: dados.aguardando.length,
      icon: Clock,
      fundo: 'bg-warning-bg',
      cor: 'text-warning',
      destino: 'agenda',
    },
    {
      rotulo: 'Já chegaram',
      valor: dados.chegaram.length,
      icon: CheckCheck,
      fundo: 'bg-success-bg',
      cor: 'text-success',
      destino: 'agenda',
    },
    {
      rotulo: 'Entradas registradas hoje',
      valor: dados.entradas,
      icon: ClipboardList,
      fundo: 'bg-blue-10',
      cor: 'text-blue',
      destino: 'visitantes',
    },
    {
      rotulo: 'Usuários ativos',
      valor: dados.usuarios,
      icon: Users,
      fundo: 'bg-blue-10',
      cor: 'text-blue',
      destino: 'usuarios',
    },
  ]

  const atalhos = [
    { rotulo: 'Registrar visitante', hint: 'Balcão · sem agendamento', icon: UserPlus, destino: 'registrar' },
    { rotulo: 'Entradas de hoje', hint: `Ver ${dados.entradas} registros`, icon: ClipboardList, destino: 'visitantes' },
    { rotulo: 'Relatório do dia', hint: 'Exportar CSV / imprimir', icon: FileText, destino: 'relatorio' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-xl sm:text-2xl">Painel da recepção</h1>
          <p className="page-sub text-sm text-gray-20 mt-1.5">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            ·{' '}
            <strong className="text-blue-dark">
              {totalAgenda} {totalAgenda === 1 ? 'agendamento' : 'agendamentos'} hoje
            </strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="success" dot xs className="hidden sm:inline-flex">
            Atualiza a cada 30s
          </Chip>
          <Btn variant="outline" size="sm" icon={RefreshCw} onClick={carregar} disabled={carregando}>
            <span className="hidden sm:inline">Atualizar</span>
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricas.map((m) => {
          const Icon = m.icon
          return (
            <button
              key={m.rotulo}
              type="button"
              onClick={() => onNav?.(m.destino)}
              className="card card-hover text-left p-4 flex items-center gap-3"
            >
              <div className={`w-11 h-11 rounded flex items-center justify-center flex-shrink-0 ${m.fundo}`}>
                <Icon size={20} className={m.cor} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl font-display font-bold text-blue-dark leading-none">{m.valor}</div>
                <div className="text-xs text-gray-60 mt-1">{m.rotulo}</div>
              </div>
            </button>
          )
        })}
      </div>

      <section aria-labelledby="agendaHoje">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 id="agendaHoje" className="font-display text-base font-bold text-blue-dark">
              Agenda de hoje
            </h2>
            <p className="text-xs text-gray-20 mt-0.5">
              Abra a Agenda de hoje para registrar a chegada de cada pessoa
            </p>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => onNav?.('agenda')}>
            Ver agenda completa
            <ArrowRight size={16} />
          </Btn>
        </div>

        {totalAgenda === 0 ? (
          <div className="card">
            <Empty icon={CalendarClock}>Nenhuma visita agendada para hoje.</Empty>
          </div>
        ) : (
          <div className="space-y-3">
            {dados.aguardando.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <div className="text-xs font-bold uppercase tracking-wider text-warning-dark">
                    Próximas chegadas
                  </div>
                  <div className="flex-1 h-px bg-gray-2" />
                </div>
                {dados.aguardando.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onNav?.('agenda')}
                    className="card card-hover w-full text-left border-l-4 border-warning"
                  >
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center justify-center px-3 py-2 bg-warning-bg rounded flex-shrink-0 sm:min-w-[78px]">
                        <div className="text-base font-mono font-bold text-warning-dark leading-none">
                          {String(a.hora).slice(0, 5)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-base font-semibold text-blue-dark">{a.nome_visitante}</div>
                          <Chip tone="warn" icon={Clock}>
                            Aguardando chegada
                          </Chip>
                        </div>
                        <div className="text-sm text-gray-20 mt-1 flex flex-wrap gap-x-3">
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 size={14} />
                            <strong>{a.setor}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="btn btn-primary btn-md pointer-events-none flex-shrink-0">
                        <UserPlus size={16} />
                        Registrar chegada
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {dados.chegaram.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <div className="text-xs font-bold uppercase tracking-wider text-success-dark">
                    Já chegaram hoje
                  </div>
                  <div className="flex-1 h-px bg-gray-2" />
                </div>
                {dados.chegaram.slice(0, 3).map((a) => (
                  <div key={a.id} className="card border-l-4 border-success">
                    <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center justify-center px-3 py-1.5 bg-success-bg rounded flex-shrink-0 sm:min-w-[78px]">
                        <div className="text-base font-mono font-bold text-success-dark leading-none">
                          {String(a.hora).slice(0, 5)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold text-blue-dark">{a.nome_visitante}</div>
                          <Chip tone="success" icon={CheckCircle2}>
                            Chegou
                          </Chip>
                        </div>
                        <div className="text-sm text-gray-20 mt-0.5 inline-flex items-center gap-1.5">
                          <Building2 size={14} />
                          {a.setor}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <div className="px-5 py-3.5 border-b border-gray-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Activity size={16} className="text-blue" />
              <h2 className="font-semibold text-blue-dark truncate">Últimas entradas registradas</h2>
            </div>
            <button
              type="button"
              onClick={() => onNav?.('visitantes')}
              className="text-xs font-semibold text-blue hover:underline flex-shrink-0"
            >
              Ver todas
            </button>
          </div>
          {dados.ultimas.length === 0 ? (
            <Empty icon={ClipboardList}>Nenhuma entrada registrada hoje.</Empty>
          ) : (
            <div className="divide-y divide-gray-2">
              {dados.ultimas.map((v) => (
                <div
                  key={v.id}
                  className="w-full text-left px-5 py-2.5 flex items-center gap-3 hover:bg-blue-10"
                >
                  {v.foto_url ? (
                    <FotoAmpliavel src={v.foto_url} alt={v.nome} size={36} />
                  ) : (
                    <Avatar nome={v.nome} size={36} />
                  )}
                  <button
                    type="button"
                    onClick={() => onNav?.('visitantes')}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="font-semibold text-blue-dark truncate text-sm">{v.nome}</div>
                    <div className="text-xs text-gray-20 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <BadgeOrigem servidor={Boolean(v.servidor_id)}>
                        {v.servidor_id ? (
                          <>
                            <Landmark size={12} />
                            {v.servidores?.lotacao || 'Servidor'}
                          </>
                        ) : (
                          <>
                            <User size={12} />
                            Visitante
                          </>
                        )}
                      </BadgeOrigem>
                      <span className="inline-flex items-center gap-1">
                        <ArrowRight size={12} />
                        {v.setor}
                      </span>
                    </div>
                  </button>
                  <div className="text-sm font-mono text-gray-20 flex-shrink-0">{horaCurta(v.horario)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-60 uppercase tracking-wider mb-3">Atalhos</h2>
          <div className="space-y-2">
            {atalhos.map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.rotulo}
                  type="button"
                  onClick={() => onNav?.(a.destino)}
                  className="card card-hover p-3 text-left w-full flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded bg-blue-10 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-blue" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-blue-dark">{a.rotulo}</div>
                    <div className="text-xs text-gray-20">{a.hint}</div>
                  </div>
                  <ChevronRight size={16} className="text-gray-5 flex-shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
