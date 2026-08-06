import { useEffect, useState } from 'react'
import { RefreshCw, Users, Calendar, ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { C, PAPEIS } from '../lib/theme'
import { Btn, Card, Empty, Alert } from '../components/ui'
import Paginacao, { usePaginacao } from '../components/Paginacao'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function PainelGestor() {
  const [stats, setStats] = useState({ visitantes: 0, agendamentos: 0, usuarios: 0 })

  useEffect(() => {
    async function load() {
      const inicio = `${hojeISO()}T00:00:00`
      const fim = `${hojeISO()}T23:59:59`
      const [v, a, u] = await Promise.all([
        supabase.from('visitantes').select('id', { count: 'exact', head: true }).gte('horario', inicio).lte('horario', fim),
        supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('data', hojeISO()).neq('status', 'cancelado'),
        supabase.from('perfis').select('id', { count: 'exact', head: true }).eq('ativo', true),
      ])
      setStats({
        visitantes: v.count || 0,
        agendamentos: a.count || 0,
        usuarios: u.count || 0,
      })
    }
    load()
  }, [])

  const cards = [
    { label: 'Visitantes hoje', valor: stats.visitantes, icon: ClipboardList, cor: C.blue },
    { label: 'Agendamentos hoje', valor: stats.agendamentos, icon: Calendar, cor: C.orange },
    { label: 'Usuários ativos', valor: stats.usuarios, icon: Users, cor: C.green },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Painel</h1>
        <p className="text-sm mt-1" style={{ color: C.gray60 }}>
          Visão geral do Controle de Recepção
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label} className="p-5">
              <div className="w-9 h-9 flex items-center justify-center mb-3" style={{ backgroundColor: c.cor + '18' }}>
                <Icon size={18} style={{ color: c.cor }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: C.blueDark }}>{c.valor}</div>
              <div className="text-sm" style={{ color: C.gray60 }}>{c.label}</div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function Usuarios() {
  const [lista, setLista] = useState([])
  const [erro, setErro] = useState('')
  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(lista, 10)

  async function carregar() {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('nome')
    if (error) setErro(error.message)
    setLista(data || [])
    reset()
  }

  useEffect(() => { carregar() }, [])

  async function toggleAtivo(u) {
    await supabase.from('perfis').update({ ativo: !u.ativo }).eq('id', u.id)
    await carregar()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Usuários</h1>
          <p className="text-sm mt-1" style={{ color: C.gray60 }}>Pessoas com acesso ao sistema</p>
        </div>
        <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}

      <Card>
        {itens.length === 0 ? (
          <Empty>Nenhum usuário.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.gray1 }}>
                <th className="text-left px-5 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Nome</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>E-mail</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Papel</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Setor</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((u) => (
                <tr key={u.id} className="border-t" style={{ borderColor: C.gray3 }}>
                  <td className="px-5 py-3 font-semibold" style={{ color: C.blueDark }}>{u.nome}</td>
                  <td className="px-3 py-3" style={{ color: C.gray80 }}>{u.email}</td>
                  <td className="px-3 py-3">{PAPEIS[u.papel] || u.papel}</td>
                  <td className="px-3 py-3" style={{ color: C.gray60 }}>{u.setor || '—'}</td>
                  <td className="px-3 py-3">
                    <span style={{ color: u.ativo ? C.green : C.red }}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Btn variant="ghost" size="sm" onClick={() => toggleAtivo(u)}>
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginacao pagina={pagina} totalPaginas={totalPaginas} totalItens={lista.length} onChange={irPara} />
      </Card>
    </div>
  )
}

export function VisitantesGestor() {
  const [lista, setLista] = useState([])
  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(lista, 10)

  async function carregar() {
    const inicio = `${hojeISO()}T00:00:00`
    const fim = `${hojeISO()}T23:59:59`
    const { data } = await supabase
      .from('visitantes')
      .select('*')
      .gte('horario', inicio)
      .lte('horario', fim)
      .order('horario', { ascending: false })
    setLista(data || [])
    reset()
  }

  useEffect(() => { carregar() }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Visitantes de hoje</h1>
          <p className="text-sm mt-1" style={{ color: C.gray60 }}>{new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
      </div>
      <Card>
        {itens.length === 0 ? (
          <Empty>Nenhum visitante hoje.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.gray1 }}>
                <th className="text-left px-5 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Nome</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>CPF</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Setor</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Telefone</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Obs.</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Horário</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((v) => (
                <tr key={v.id} className="border-t" style={{ borderColor: C.gray3 }}>
                  <td className="px-5 py-3 font-semibold" style={{ color: C.blueDark }}>{v.nome}</td>
                  <td className="px-3 py-3 font-mono text-xs">{v.cpf}</td>
                  <td className="px-3 py-3">{v.setor}</td>
                  <td className="px-3 py-3">{v.telefone || '—'}</td>
                  <td className="px-3 py-3 text-xs" style={{ color: C.gray60 }}>{v.observacao || '—'}</td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {new Date(v.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginacao pagina={pagina} totalPaginas={totalPaginas} totalItens={lista.length} onChange={irPara} />
      </Card>
    </div>
  )
}

export function AgendamentosGestor() {
  const [lista, setLista] = useState([])
  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(lista, 10)

  async function carregar() {
    const { data } = await supabase
      .from('agendamentos')
      .select('*')
      .gte('data', hojeISO())
      .order('data')
      .order('hora')
    setLista(data || [])
    reset()
  }

  useEffect(() => { carregar() }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Agendamentos</h1>
          <p className="text-sm mt-1" style={{ color: C.gray60 }}>A partir de hoje</p>
        </div>
        <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
      </div>
      <Card>
        {itens.length === 0 ? (
          <Empty>Nenhum agendamento.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.gray1 }}>
                <th className="text-left px-5 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Visitante</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Data</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Hora</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Setor</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((a) => (
                <tr key={a.id} className="border-t" style={{ borderColor: C.gray3 }}>
                  <td className="px-5 py-3 font-semibold" style={{ color: C.blueDark }}>{a.nome_visitante}</td>
                  <td className="px-3 py-3">{new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-3 py-3 font-mono">{String(a.hora).slice(0, 5)}</td>
                  <td className="px-3 py-3">{a.setor}</td>
                  <td className="px-3 py-3">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginacao pagina={pagina} totalPaginas={totalPaginas} totalItens={lista.length} onChange={irPara} />
      </Card>
    </div>
  )
}
