import { useEffect, useState } from 'react'
import { AlertTriangle, Download, FileText, Landmark, Printer, RefreshCw, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { maskCpfExibicao } from '../../lib/br'
import { Alert, BadgeOrigem, Btn, Empty, TableWrap } from '../../components/ui'
import Paginacao, { usePaginacao } from '../../components/ui/Paginacao'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function csvEscape(v) {
  const s = String(v ?? '')
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function Metrica({ rotulo, valor }) {
  return (
    <div className="card p-3 sm:p-4">
      <div className="text-xs uppercase tracking-wider font-semibold text-gray-20">{rotulo}</div>
      <div className="text-2xl font-display font-bold text-blue-dark mt-0.5 num">{valor}</div>
    </div>
  )
}

export default function RelatorioDia() {
  const [lista, setLista] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(lista, 15)

  async function carregar() {
    setCarregando(true)
    const inicio = `${hojeISO()}T00:00:00`
    const fim = `${hojeISO()}T23:59:59`
    const { data, error } = await supabase
      .from('visitantes')
      .select('*, servidores(lotacao, matricula)')
      .gte('horario', inicio)
      .lte('horario', fim)
      .order('horario', { ascending: true })
    if (error) {
      const r2 = await supabase
        .from('visitantes')
        .select('*')
        .gte('horario', inicio)
        .lte('horario', fim)
        .order('horario', { ascending: true })
      if (r2.error) setErro(r2.error.message)
      else setLista(r2.data || [])
    } else {
      setLista(data || [])
    }
    reset()
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const servidores = lista.filter((v) => v.servidor_id).length
  const externos = lista.length - servidores
  const agendadas = lista.filter((v) => v.tipo === 'agendada').length

  function baixarCsv() {
    const header = ['Horario', 'Nome', 'CPF', 'Setor', 'Orgao', 'Telefone', 'Tipo', 'Observacao']
    const lines = [header.join(';')]
    for (const v of lista) {
      lines.push([
        new Date(v.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        v.nome,
        v.cpf ? maskCpfExibicao(v.cpf) : '',
        v.setor,
        v.servidor_id ? (v.servidores?.lotacao || '') : '',
        v.telefone || '',
        v.tipo === 'agendada' ? 'Agendada' : 'Espontanea',
        v.observacao || '',
      ].map(csvEscape).join(';'))
    }
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-visitantes-${hojeISO()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hojeExtenso = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 no-print">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl">Relatório do dia</h1>
          <p className="page-sub text-sm text-gray-20 mt-1.5">
            {hojeExtenso}
            {!carregando && ` · ${lista.length} ${lista.length === 1 ? 'registro' : 'registros'}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" icon={RefreshCw} onClick={carregar} disabled={carregando}>
            Atualizar
          </Btn>
          <Btn variant="secondary" icon={Printer} onClick={() => window.print()} disabled={!lista.length}>
            Imprimir
          </Btn>
          <Btn icon={Download} onClick={baixarCsv} disabled={!lista.length}>
            Baixar CSV
          </Btn>
        </div>
      </div>

      {erro && (
        <Alert type="error" icon={AlertTriangle}>
          {erro}
        </Alert>
      )}

      <div className="print-only mb-4">
        <div className="text-lg font-bold">SEMCAS · Controle de Recepção</div>
        <div className="text-sm">Relatório de visitantes — {hojeExtenso}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metrica rotulo="Total" valor={lista.length} />
        <Metrica rotulo="Servidores" valor={servidores} />
        <Metrica rotulo="Visitantes" valor={externos} />
        <Metrica rotulo="Agendados" valor={agendadas} />
      </div>

      <div className="card">
        {carregando ? (
          <Empty>Carregando registros...</Empty>
        ) : lista.length === 0 ? (
          <Empty icon={FileText}>Nenhum visitante registrado hoje.</Empty>
        ) : (
          <>
            <TableWrap>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Hora</th>
                    <th className="th">Nome</th>
                    <th className="th">CPF</th>
                    <th className="th">Setor</th>
                    <th className="th">Origem</th>
                    <th className="th">Telefone</th>
                    <th className="th">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((v) => {
                    const servidor = Boolean(v.servidor_id)
                    return (
                      <tr key={v.id}>
                        <td className="td font-mono font-semibold whitespace-nowrap">
                          {new Date(v.horario).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="td">
                          <div className="font-semibold text-blue-dark">{v.nome}</div>
                          <BadgeOrigem servidor={servidor} className="mt-1 !text-[10px] !px-1.5">
                            {servidor ? (
                              <>
                                <Landmark size={10} />
                                Servidor
                              </>
                            ) : (
                              <>
                                <User size={10} />
                                Visitante
                              </>
                            )}
                          </BadgeOrigem>
                          {v.tipo === 'agendada' && (
                            <span className="chip chip-warn chip-xs ml-1">Agendada</span>
                          )}
                        </td>
                        <td className="td font-mono text-xs whitespace-nowrap">
                          {v.cpf ? maskCpfExibicao(v.cpf) : <span className="text-gray-5">—</span>}
                        </td>
                        <td className="td">{v.setor}</td>
                        <td className="td text-sm">
                          {servidor && v.servidores?.lotacao ? (
                            v.servidores.lotacao
                          ) : (
                            <span className="text-gray-5">—</span>
                          )}
                        </td>
                        <td className="td font-mono text-xs whitespace-nowrap">
                          {v.telefone || <span className="text-gray-5">—</span>}
                        </td>
                        <td className="td text-xs text-gray-20 italic max-w-[200px] truncate">
                          {v.observacao || <span className="text-gray-5 not-italic">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TableWrap>
            <div className="no-print">
              <Paginacao
                pagina={pagina}
                totalPaginas={totalPaginas}
                totalItens={lista.length}
                onChange={irPara}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
