import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  RefreshCw,
  UserPlus,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { cpfValido, formatCpf } from '../../lib/br'
import { Alert, Btn, Chip, Empty } from '../../components/ui'
import Paginacao, { usePaginacao } from '../../components/ui/Paginacao'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
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

  const resumo = [
    { rotulo: 'Aguardando chegada', valor: pendentes, cor: 'text-warning-dark' },
    { rotulo: 'Chegaram', valor: chegaram, cor: 'text-success-dark' },
    { rotulo: 'Total do dia', valor: agendamentos.length, cor: 'text-gray-20' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-xl sm:text-2xl">Agenda de hoje</h1>
          <p className="page-sub text-sm text-gray-20 mt-1.5">
            Visitas com hora marcada · {new Date().toLocaleDateString('pt-BR')}
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

      <div className="grid grid-cols-3 gap-3">
        {resumo.map((r) => (
          <div key={r.rotulo} className="card p-3 sm:p-4">
            <div className={`text-xs uppercase tracking-wider font-semibold ${r.cor}`}>{r.rotulo}</div>
            <div className="text-2xl sm:text-3xl font-display font-bold text-blue-dark mt-1">
              {r.valor}
            </div>
          </div>
        ))}
      </div>

      {itens.length === 0 ? (
        <div className="card">
          <Empty icon={CalendarClock}>Nenhum agendamento para hoje.</Empty>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((a) => {
            const chegou = a.status === 'chegou'
            return (
              <div
                key={a.id}
                className={`card border-l-4 ${chegou ? 'border-success opacity-90' : 'border-warning'}`}
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`flex flex-col items-center justify-center px-3 py-2 rounded flex-shrink-0 min-w-[68px] ${
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
                        className={`text-[10px] font-semibold uppercase tracking-wider mt-1 ${
                          chegou ? 'text-success-dark' : 'text-warning-dark'
                        }`}
                      >
                        Hoje
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-base sm:text-lg font-semibold text-blue-dark">
                          {a.nome_visitante}
                        </div>
                        {chegou ? (
                          <Chip tone="success" icon={CheckCircle2}>
                            Chegou
                          </Chip>
                        ) : (
                          <Chip tone="warn" icon={Clock}>
                            Aguardando chegada
                          </Chip>
                        )}
                      </div>
                      <div className="text-sm text-gray-60 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 size={14} />
                          <strong>{a.setor}</strong>
                        </span>
                      </div>
                      {a.observacao && (
                        <div className="text-sm text-blue-dark mt-1.5 italic">“{a.observacao}”</div>
                      )}
                    </div>
                  </div>
                  {!chegou && (
                    <Btn
                      size="md"
                      icon={UserPlus}
                      onClick={() => marcarChegou(a)}
                      disabled={chegandoId === a.id}
                      className="sm:flex-shrink-0"
                    >
                      {chegandoId === a.id ? 'Registrando...' : 'Registrar chegada'}
                    </Btn>
                  )}
                </div>
              </div>
            )
          })}

          {totalPaginas > 1 && (
            <div className="card">
              <Paginacao
                pagina={pagina}
                totalPaginas={totalPaginas}
                totalItens={agendamentos.length}
                onChange={irPara}
                rotulo="agendamento"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
