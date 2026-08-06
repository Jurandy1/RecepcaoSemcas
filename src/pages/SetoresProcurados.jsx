import { useCallback, useEffect, useState } from 'react'
import { Building2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/theme'
import { Btn, Field, Input, Card, Alert, Empty } from '../components/ui'
import Paginacao, { usePaginacao } from '../components/Paginacao'

export default function SetoresProcurados() {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [nome, setNome] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  const filtrada = lista.filter((s) =>
    !busca.trim() || s.nome.toLowerCase().includes(busca.trim().toLowerCase())
  )
  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(filtrada, 12)

  async function carregar() {
    setErro('')
    const { data, error } = await supabase
      .from('setores_procurados')
      .select('*')
      .order('nome')
    if (error) {
      setErro(
        error.message.includes('setores_procurados') || error.code === '42P01'
          ? 'Tabela ainda não existe. Rode supabase/setores-procurados.sql no Supabase.'
          : error.message
      )
      setLista([])
      return
    }
    setLista(data || [])
    reset()
  }

  useEffect(() => { carregar() }, [])

  function limparForm() {
    setNome('')
    setEditandoId(null)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setMsg('')
    const n = nome.trim()
    if (!n) {
      setErro('Informe o nome do setor.')
      return
    }

    setSalvando(true)
    try {
      if (editandoId) {
        const { error } = await supabase
          .from('setores_procurados')
          .update({ nome: n, atualizado_em: new Date().toISOString() })
          .eq('id', editandoId)
        if (error) throw error
        setMsg('Setor atualizado.')
      } else {
        const { error } = await supabase
          .from('setores_procurados')
          .insert({ nome: n })
        if (error) {
          if (error.code === '23505') throw new Error('Já existe um setor com esse nome.')
          throw error
        }
        setMsg('Setor cadastrado.')
      }
      limparForm()
      await carregar()
    } catch (err) {
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivo(s) {
    setErro('')
    const { error } = await supabase
      .from('setores_procurados')
      .update({ ativo: !s.ativo, atualizado_em: new Date().toISOString() })
      .eq('id', s.id)
    if (error) setErro(error.message)
    else await carregar()
  }

  async function excluir(s) {
    if (!confirm(`Excluir o setor "${s.nome}"?`)) return
    setErro('')
    const { error } = await supabase.from('setores_procurados').delete().eq('id', s.id)
    if (error) setErro(error.message)
    else {
      if (editandoId === s.id) limparForm()
      await carregar()
    }
  }

  function editar(s) {
    setEditandoId(s.id)
    setNome(s.nome)
    setMsg('')
    setErro('')
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: C.blueDark }}>Setor procurado</h1>
        <p className="text-base mt-1" style={{ color: C.gray60 }}>
          Cadastre os nomes dos setores para usar no registro e nos agendamentos.
          Os nomes poderão ser ajustados depois.
        </p>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <Card className="p-6">
        <form onSubmit={salvar} className="space-y-4">
          <Field label={editandoId ? 'Editar setor' : 'Novo setor'} required>
            <Input
              large
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Gabinete, Recursos Humanos..."
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Btn type="submit" icon={editandoId ? Pencil : Plus} disabled={salvando}>
              {salvando ? 'Salvando...' : editandoId ? 'Salvar alteração' : 'Cadastrar setor'}
            </Btn>
            {editandoId && (
              <Btn type="button" variant="ghost" onClick={limparForm}>Cancelar edição</Btn>
            )}
          </div>
        </form>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
        <Input
          value={busca}
          onChange={(e) => { setBusca(e.target.value); irPara(1) }}
          placeholder="Buscar setor..."
        />
        <Btn variant="secondary" icon={RefreshCw} onClick={carregar}>Atualizar</Btn>
      </div>

      <Card>
        {itens.length === 0 ? (
          <Empty>
            <Building2 className="mx-auto mb-2 opacity-50" size={32} />
            Nenhum setor cadastrado ainda.
          </Empty>
        ) : (
          <div>
            {itens.map((s) => (
              <div
                key={s.id}
                className="px-5 py-3 border-t flex items-center justify-between gap-3"
                style={{ borderColor: C.gray3 }}
              >
                <div className="min-w-0">
                  <div className="font-semibold" style={{ color: s.ativo ? C.blueDark : C.gray20 }}>
                    {s.nome}
                  </div>
                  <div className="text-xs" style={{ color: C.gray20 }}>
                    {s.ativo ? 'Ativo' : 'Inativo'}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Btn variant="ghost" size="sm" onClick={() => editar(s)}>Editar</Btn>
                  <Btn variant="secondary" size="sm" onClick={() => alternarAtivo(s)}>
                    {s.ativo ? 'Desativar' : 'Ativar'}
                  </Btn>
                  <Btn variant="danger" size="sm" icon={Trash2} onClick={() => excluir(s)}>
                    Excluir
                  </Btn>
                </div>
              </div>
            ))}
            <Paginacao
              pagina={pagina}
              totalPaginas={totalPaginas}
              totalItens={filtrada.length}
              onChange={irPara}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

/** Hook para carregar setores ativos (formulários). */
export function useSetoresAtivos() {
  const [setores, setSetores] = useState([])

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('setores_procurados')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
    setSetores(data || [])
  }, [])

  useEffect(() => { carregar() }, [carregar])

  return { setores, recarregarSetores: carregar }
}
