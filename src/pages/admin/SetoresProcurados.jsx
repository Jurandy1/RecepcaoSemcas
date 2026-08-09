import { useEffect, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Alert, Btn, Chip, Empty, Field, Input } from '../../components/ui'
import Paginacao, { usePaginacao } from '../../components/ui/Paginacao'

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
          ? 'Tabela ainda não existe. Rode supabase/patches/setores-procurados.sql no Supabase.'
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
    setErro('')
    const { data: dono } = await supabase
      .from('perfis')
      .select('nome')
      .eq('papel', 'setor')
      .ilike('setor', s.nome)
      .maybeSingle()

    const aviso = dono
      ? `O setor "${s.nome}" está reservado para ${dono.nome}, que agenda visitas nele.\n\n`
        + 'Excluir aqui só tira o setor da lista dos formulários — o acesso dessa pessoa continua. '
        + 'Para liberar o setor, use Usuários → Liberar setor.\n\nExcluir mesmo assim?'
      : `Excluir o setor "${s.nome}"?`

    if (!confirm(aviso)) return
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="page-title text-2xl sm:text-3xl">Setores</h1>
        <p className="page-sub text-sm text-gray-20 mt-1.5">
          Cadastre os setores disponíveis no atendimento. São usados nos registros e agendamentos.
        </p>
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

      <div className="card shadow-e1">
        <div className="p-5 sm:p-6">
          <form onSubmit={salvar} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 w-full">
              <Field label={editandoId ? 'Editar setor' : 'Novo setor'} required>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Gabinete, Recursos Humanos..."
                />
              </Field>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button type="submit" className="btn btn-primary btn-md w-full sm:w-auto" disabled={salvando}>
                {editandoId ? <Pencil size={16} /> : <Plus size={16} />}
                {salvando ? 'Salvando...' : editandoId ? 'Salvar alteração' : 'Cadastrar'}
              </button>
              {editandoId && (
                <Btn variant="ghost" size="md" onClick={limparForm}>
                  Cancelar
                </Btn>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-5" />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              irPara(1)
            }}
            placeholder="Buscar setor..."
            style={{ paddingLeft: 36 }}
          />
        </div>
        <Btn variant="outline" size="sm" icon={RefreshCw} onClick={carregar} className="flex-shrink-0">
          Atualizar
        </Btn>
      </div>

      <div className="card">
        {itens.length === 0 ? (
          <Empty icon={Building2}>Nenhum setor cadastrado ainda.</Empty>
        ) : (
          <>
            <div className="divide-y divide-gray-2">
              {itens.map((s) => (
                <div
                  key={s.id}
                  className={`px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
                    s.ativo ? '' : 'opacity-70'
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div
                      className={`w-9 h-9 flex items-center justify-center rounded flex-shrink-0 ${
                        s.ativo ? 'bg-blue-10' : 'bg-gray-2'
                      }`}
                    >
                      <Building2 size={16} className={s.ativo ? 'text-blue' : 'text-gray-5'} />
                    </div>
                    <div className="min-w-0">
                      <div className={`font-semibold ${s.ativo ? 'text-blue-dark' : 'text-gray-60'}`}>
                        {s.nome}
                      </div>
                      <Chip tone={s.ativo ? 'success' : 'gray'} dot xs>
                        {s.ativo ? 'Ativo' : 'Inativo'}
                      </Chip>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                    <Btn variant="ghost" size="sm" onClick={() => editar(s)}>
                      Editar
                    </Btn>
                    <Btn
                      variant={s.ativo ? 'outline' : 'secondary'}
                      size="sm"
                      onClick={() => alternarAtivo(s)}
                    >
                      {s.ativo ? 'Desativar' : 'Ativar'}
                    </Btn>
                    <Btn variant="dangerGhost" size="sm" icon={Trash2} onClick={() => excluir(s)}>
                      Excluir
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
            <Paginacao
              pagina={pagina}
              totalPaginas={totalPaginas}
              totalItens={filtrada.length}
              onChange={irPara}
              rotulo="setor"
            />
          </>
        )}
      </div>
    </div>
  )
}
