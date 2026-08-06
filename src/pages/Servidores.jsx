import { useEffect, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/theme'
import { maskCpf, cpfValido, formatCpf } from '../lib/br'
import { Btn, Field, Input, Card, Alert, Empty } from '../components/ui'
import Paginacao, { usePaginacao } from '../components/Paginacao'

export default function Servidores() {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [editando, setEditando] = useState(null)
  const [cpfEdit, setCpfEdit] = useState('')
  const [carregando, setCarregando] = useState(false)

  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(lista, 10)

  async function carregar(q = busca) {
    setCarregando(true)
    setErro('')
    let query = supabase
      .from('servidores')
      .select('*')
      .eq('ativo', true)
      .order('nome')
      .limit(200)

    const termo = q.trim()
    if (termo) {
      query = query.or(`nome.ilike.%${termo}%,lotacao.ilike.%${termo}%,matricula.ilike.%${termo}%,cpf.ilike.%${termo}%`)
    }

    const { data, error } = await query
    if (error) {
      setErro(error.message.includes('servidores')
        ? 'Tabela servidores ainda não existe. Rode supabase/melhorias-recepcao.sql e importe o CSV.'
        : error.message)
      setLista([])
    } else {
      setLista(data || [])
      reset()
    }
    setCarregando(false)
  }

  useEffect(() => { carregar('') }, [])

  function abrirCpf(s) {
    setEditando(s)
    setCpfEdit(s.cpf ? formatCpf(s.cpf) : '')
    setMsg('')
    setErro('')
  }

  async function salvarCpf(e) {
    e.preventDefault()
    if (!cpfValido(cpfEdit)) {
      setErro('CPF inválido.')
      return
    }
    const { error } = await supabase
      .from('servidores')
      .update({ cpf: formatCpf(cpfEdit), atualizado_em: new Date().toISOString() })
      .eq('id', editando.id)
    if (error) {
      setErro(error.message)
      return
    }
    setMsg('CPF atualizado.')
    setEditando(null)
    await carregar()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Servidores</h1>
        <p className="text-sm mt-1" style={{ color: C.gray60 }}>
          Pré-lista municipal. Complete o CPF para identificar nas próximas visitas.
        </p>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <div className="flex gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && carregar()}
          placeholder="Buscar por nome, lotação, matrícula ou CPF..."
        />
        <Btn icon={Search} onClick={() => carregar()}>Buscar</Btn>
        <Btn variant="secondary" icon={RefreshCw} onClick={() => carregar('')}>Limpar</Btn>
      </div>

      {editando && (
        <Card className="p-5">
          <h2 className="font-bold mb-3" style={{ color: C.blueDark }}>
            Completar CPF — {editando.nome}
          </h2>
          <p className="text-sm mb-3" style={{ color: C.gray60 }}>
            {editando.lotacao} · Mat. {editando.matricula}
          </p>
          <form onSubmit={salvarCpf} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Field label="CPF" required>
                <Input
                  value={cpfEdit}
                  onChange={(e) => setCpfEdit(maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                />
              </Field>
            </div>
            <Btn type="submit">Salvar CPF</Btn>
            <Btn type="button" variant="ghost" onClick={() => setEditando(null)}>Cancelar</Btn>
          </form>
        </Card>
      )}

      <Card>
        {carregando ? (
          <Empty>Carregando...</Empty>
        ) : itens.length === 0 ? (
          <Empty>Nenhum servidor encontrado. Importe o CSV se a base ainda estiver vazia.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.gray1 }}>
                <th className="text-left px-5 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Nome</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Lotação</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>Matrícula</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase" style={{ color: C.gray60 }}>CPF</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((s) => (
                <tr key={s.id} className="border-t" style={{ borderColor: C.gray3 }}>
                  <td className="px-5 py-3">
                    <div className="font-semibold" style={{ color: C.blueDark }}>{s.nome}</div>
                    <div className="text-xs" style={{ color: C.gray20 }}>{s.cargo || ''}</div>
                  </td>
                  <td className="px-3 py-3">{s.lotacao}</td>
                  <td className="px-3 py-3 font-mono text-xs">{s.matricula}</td>
                  <td className="px-3 py-3 font-mono text-xs">{s.cpf || '—'}</td>
                  <td className="px-3 py-3 text-right">
                    <Btn variant="ghost" size="sm" onClick={() => abrirCpf(s)}>
                      {s.cpf ? 'Editar CPF' : 'Informar CPF'}
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
