import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

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

/**
 * Setores que ainda não têm um usuário de agendamento responsável.
 * Usado na tela de convite, onde a pessoa ainda não está logada.
 * Se o patch setor-exclusivo.sql não tiver sido rodado, cai na lista completa.
 */
export function useSetoresDisponiveis() {
  const [setores, setSetores] = useState([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data, error } = await supabase.rpc('setores_disponiveis')
    if (!error && data) {
      setSetores(data.map((s, i) => ({ id: s.nome || i, nome: s.nome })))
    } else {
      const { data: todos } = await supabase
        .from('setores_procurados')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
      setSetores(todos || [])
    }
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  return { setores, carregando, recarregarSetores: carregar }
}
