import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Lock, RefreshCw, Users as UsersIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PAPEIS } from '../../lib/theme'
import { Alert, Avatar, Btn, Chip, Empty } from '../../components/ui'
import Paginacao, { usePaginacao } from '../../components/ui/Paginacao'

export function Usuarios() {
  const [lista, setLista] = useState([])
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(lista, 10)

  async function carregar() {
    const { data, error } = await supabase.from('perfis').select('*').order('nome')
    if (error) setErro(error.message)
    setLista(data || [])
    reset()
  }

  useEffect(() => {
    carregar()
  }, [])

  async function toggleAtivo(u) {
    const acao = u.ativo ? 'Desativar' : 'Ativar'
    if (!confirm(`${acao} o acesso de ${u.nome}?`)) return
    const { error } = await supabase.from('perfis').update({ ativo: !u.ativo }).eq('id', u.id)
    if (error) {
      setErro(error.message)
      return
    }
    await carregar()
  }

  async function liberarSetor(u) {
    const ok = confirm(
      `Liberar o setor "${u.setor}"?\n\n`
        + `Ele volta a ficar disponível para outra pessoa e ${u.nome} deixa de conseguir agendar `
        + 'até receber um novo convite com o setor correto.'
    )
    if (!ok) return
    setErro('')
    setMsg('')
    const { error } = await supabase.from('perfis').update({ setor: null }).eq('id', u.id)
    if (error) {
      setErro(error.message)
      return
    }
    setMsg(`Setor "${u.setor}" liberado.`)
    await carregar()
  }

  function tomPapel(papel) {
    return papel === 'admin' || papel === 'coordenadora' ? 'blue' : 'outline'
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl">Usuários</h1>
          <p className="page-sub text-sm text-gray-20 mt-1.5">
            Pessoas com acesso ao sistema · {lista.length} {lista.length === 1 ? 'usuário' : 'usuários'}
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

      {itens.length === 0 ? (
        <div className="card">
          <Empty icon={UsersIcon}>Nenhum usuário cadastrado.</Empty>
        </div>
      ) : (
        <>
          <div className="card hidden md:block">
            <div className="table-wrap">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Usuário</th>
                    <th className="th">Papel</th>
                    <th className="th">Setor</th>
                    <th className="th">Status</th>
                    <th className="th text-right" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((u) => (
                    <tr key={u.id}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar nome={u.nome} size={36} />
                          <div className="min-w-0">
                            <div className={`font-semibold ${u.ativo ? 'text-blue-dark' : 'text-gray-60'}`}>
                              {u.nome}
                            </div>
                            <div className="text-xs text-gray-20 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <Chip tone={tomPapel(u.papel)}>{PAPEIS[u.papel] || u.papel}</Chip>
                      </td>
                      <td className="td text-gray-60">
                        {u.papel === 'setor' && u.setor ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Lock size={13} className="text-gray-5" />
                            {u.setor}
                          </span>
                        ) : (
                          u.setor || '—'
                        )}
                      </td>
                      <td className="td">
                        {u.ativo ? (
                          <Chip tone="success" dot>
                            Ativo
                          </Chip>
                        ) : (
                          <Chip tone="gray" dot>
                            Inativo
                          </Chip>
                        )}
                      </td>
                      <td className="td text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.papel === 'setor' && u.setor && (
                            <Btn variant="ghost" size="xs" onClick={() => liberarSetor(u)}>
                              Liberar setor
                            </Btn>
                          )}
                          <Btn
                            variant={u.ativo ? 'outline' : 'secondary'}
                            size="xs"
                            onClick={() => toggleAtivo(u)}
                          >
                            {u.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao
              pagina={pagina}
              totalPaginas={totalPaginas}
              totalItens={lista.length}
              onChange={irPara}
              rotulo="usuário"
            />
          </div>

          <div className="md:hidden space-y-3">
            {itens.map((u) => (
              <div key={u.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <Avatar nome={u.nome} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold ${u.ativo ? 'text-blue-dark' : 'text-gray-60'}`}>
                      {u.nome}
                    </div>
                    <div className="text-xs text-gray-20 break-all">{u.email}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Chip tone={tomPapel(u.papel)} xs>
                        {PAPEIS[u.papel] || u.papel}
                      </Chip>
                      {u.setor && (
                        <Chip tone="gray" icon={u.papel === 'setor' ? Lock : undefined} xs>
                          {u.setor}
                        </Chip>
                      )}
                      <Chip tone={u.ativo ? 'success' : 'gray'} dot xs>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Chip>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-2 flex flex-col gap-2">
                  <Btn
                    variant={u.ativo ? 'outline' : 'secondary'}
                    size="sm"
                    full
                    onClick={() => toggleAtivo(u)}
                  >
                    {u.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                  </Btn>
                  {u.papel === 'setor' && u.setor && (
                    <Btn variant="ghost" size="sm" full onClick={() => liberarSetor(u)}>
                      Liberar setor
                    </Btn>
                  )}
                </div>
              </div>
            ))}
            <div className="card">
              <Paginacao
                pagina={pagina}
                totalPaginas={totalPaginas}
                totalItens={lista.length}
                onChange={irPara}
                rotulo="usuário"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
