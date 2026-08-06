import { useEffect, useState } from 'react'
import { RefreshCw, FileDown, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/theme'
import { maskCpfExibicao } from '../lib/br'
import { Btn, Card, Alert, Empty } from '../components/ui'
import Paginacao, { usePaginacao } from '../components/Paginacao'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function csvEscape(v) {
  const s = String(v ?? '')
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
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

  useEffect(() => { carregar() }, [])

  const espontaneas = lista.filter((v) => v.tipo !== 'agendada').length
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Relatório do dia</h1>
          <p className="text-sm mt-1" style={{ color: C.gray60 }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
          <Btn variant="secondary" icon={FileDown} onClick={baixarCsv} disabled={!lista.length}>Baixar CSV</Btn>
          <Btn icon={Printer} onClick={() => window.print()}>Imprimir</Btn>
        </div>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}

      <div className="print-only mb-4">
        <div className="text-lg font-bold">SEMCAS · Controle de Recepção</div>
        <div className="text-sm">Relatório de visitantes — {new Date().toLocaleDateString('pt-BR')}</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-bold" style={{ color: C.blueDark }}>{lista.length}</div>
          <div className="text-sm" style={{ color: C.gray60 }}>Total</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold" style={{ color: C.blueDark }}>{espontaneas}</div>
          <div className="text-sm" style={{ color: C.gray60 }}>Espontâneas</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold" style={{ color: C.blueDark }}>{agendadas}</div>
          <div className="text-sm" style={{ color: C.gray60 }}>Agendadas</div>
        </Card>
      </div>

      <Card>
        {carregando ? (
          <Empty>Carregando...</Empty>
        ) : lista.length === 0 ? (
          <Empty>Nenhum visitante hoje.</Empty>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: C.gray1 }}>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Horário</th>
                  <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Nome</th>
                  <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>CPF</th>
                  <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Setor</th>
                  <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Órgão</th>
                  <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Telefone</th>
                  <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((v) => (
                  <tr key={v.id} className="border-t" style={{ borderColor: C.gray3 }}>
                    <td className="px-4 py-2 font-mono text-xs">
                      {new Date(v.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-2 font-semibold" style={{ color: C.blueDark }}>{v.nome}</td>
                    <td className="px-3 py-2 font-mono text-xs">{maskCpfExibicao(v.cpf)}</td>
                    <td className="px-3 py-2">{v.setor}</td>
                    <td className="px-3 py-2">
                      {v.servidor_id ? (v.servidores?.lotacao || '—') : '—'}
                    </td>
                    <td className="px-3 py-2">{v.telefone || '—'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: C.gray60 }}>{v.observacao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      </Card>

      <style>{`
        .print-only { display: none; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          aside, header { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  )
}
