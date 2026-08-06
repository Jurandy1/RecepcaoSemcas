import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw, ContactRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/theme'
import { Btn, Card, Alert, Empty, Input } from '../components/ui'
import Paginacao, { usePaginacao } from '../components/Paginacao'

function formatarDataHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('pt-BR'),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

function Avatar({ pessoa, size = 48 }) {
  if (pessoa.foto_url) {
    return (
      <img
        src={pessoa.foto_url}
        alt=""
        className="object-cover flex-shrink-0 border"
        style={{ width: size, height: size, borderColor: C.gray3 }}
      />
    )
  }
  const iniciais = (pessoa.nome || '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
      style={{ width: size, height: size, backgroundColor: C.blue }}
    >
      {iniciais}
    </div>
  )
}

function HistoricoVisitante({ pessoa, onVoltar }) {
  const [visitas, setVisitas] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const { pagina, totalPaginas, itens, irPara } = usePaginacao(visitas, 15)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setCarregando(true)
      setErro('')
      const { data, error } = await supabase
        .from('visitantes')
        .select('id, nome, cpf, setor, observacao, horario, tipo, telefone, foto_url')
        .eq('cpf', pessoa.cpf)
        .order('horario', { ascending: false })
      if (!ativo) return
      if (error) setErro(error.message)
      setVisitas(data || [])
      setCarregando(false)
    }
    carregar()
    return () => { ativo = false }
  }, [pessoa.cpf])

  // Agrupa por dia para leitura fácil
  const porDia = useMemo(() => {
    const grupos = []
    let diaAtual = null
    for (const v of itens) {
      const { data, hora } = formatarDataHora(v.horario)
      if (data !== diaAtual) {
        diaAtual = data
        grupos.push({ data, itens: [] })
      }
      grupos[grupos.length - 1].itens.push({ ...v, hora })
    }
    return grupos
  }, [itens])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Btn variant="ghost" size="sm" icon={ArrowLeft} onClick={onVoltar}>
          Voltar
        </Btn>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <Avatar pessoa={pessoa} size={72} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate" style={{ color: C.blueDark }}>
              {pessoa.nome}
            </h1>
            <p className="text-base mt-1" style={{ color: C.gray60 }}>
              CPF {pessoa.cpf}
              {pessoa.telefone ? ` · ${pessoa.telefone}` : ''}
            </p>
            <p className="text-sm mt-2 font-medium" style={{ color: C.blue }}>
              {pessoa.total} visita(s) registrada(s)
            </p>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-lg font-bold" style={{ color: C.blueDark }}>Histórico de atendimentos</h2>
        <p className="text-sm mt-1" style={{ color: C.gray60 }}>
          Dias e setores para onde a pessoa foi
        </p>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}

      <Card>
        {carregando ? (
          <Empty>Carregando histórico...</Empty>
        ) : visitas.length === 0 ? (
          <Empty>Nenhuma visita encontrada.</Empty>
        ) : (
          <div>
            {porDia.map((grupo) => (
              <div key={grupo.data}>
                <div
                  className="px-5 py-2.5 text-sm font-bold border-t"
                  style={{ backgroundColor: C.gray2, color: C.blueDark, borderColor: C.gray3 }}
                >
                  {grupo.data}
                </div>
                {grupo.itens.map((v) => (
                  <div
                    key={v.id}
                    className="px-5 py-3 border-t flex flex-col sm:flex-row sm:items-center gap-2 justify-between"
                    style={{ borderColor: C.gray3 }}
                  >
                    <div className="min-w-0">
                      <div className="text-base font-semibold" style={{ color: C.blueDark }}>
                        {v.setor}
                      </div>
                      <div className="text-sm" style={{ color: C.gray60 }}>
                        {v.tipo === 'agendada' ? 'Agendada' : 'Espontânea'}
                        {v.observacao ? ` · Obs.: ${v.observacao}` : ''}
                      </div>
                    </div>
                    <div className="text-base font-mono flex-shrink-0" style={{ color: C.gray80 }}>
                      {v.hora}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <Paginacao
              pagina={pagina}
              totalPaginas={totalPaginas}
              totalItens={visitas.length}
              onChange={irPara}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

export default function VisitantesCadastrados() {
  const [pessoas, setPessoas] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState(null)

  const filtrada = useMemo(() => {
    if (!busca.trim()) return pessoas
    const q = busca.trim().toLowerCase().replace(/\D/g, '')
    const qTexto = busca.trim().toLowerCase()
    return pessoas.filter((p) => {
      const cpfDigits = (p.cpf || '').replace(/\D/g, '')
      return (
        (p.nome || '').toLowerCase().includes(qTexto)
        || (p.cpf || '').toLowerCase().includes(qTexto)
        || (q && cpfDigits.includes(q))
      )
    })
  }, [pessoas, busca])

  const { pagina, totalPaginas, itens, irPara, reset } = usePaginacao(filtrada, 12)

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      // Busca em lotes (Supabase limita ~1000 por request)
      const lote = 1000
      let from = 0
      const todas = []
      for (;;) {
        const { data, error } = await supabase
          .from('visitantes')
          .select('id, nome, cpf, telefone, setor, foto_url, horario')
          .order('horario', { ascending: false })
          .range(from, from + lote - 1)
        if (error) throw error
        const rows = data || []
        todas.push(...rows)
        if (rows.length < lote) break
        from += lote
        if (from > 20000) break
      }

      const map = new Map()
      for (const v of todas) {
        if (!v.cpf) continue
        const atual = map.get(v.cpf)
        if (!atual) {
          map.set(v.cpf, {
            cpf: v.cpf,
            nome: v.nome,
            telefone: v.telefone,
            foto_url: v.foto_url,
            ultimaVisita: v.horario,
            ultimoSetor: v.setor,
            total: 1,
          })
        } else {
          atual.total += 1
          if (!atual.foto_url && v.foto_url) atual.foto_url = v.foto_url
          if (!atual.telefone && v.telefone) atual.telefone = v.telefone
        }
      }

      const lista = Array.from(map.values()).sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
      )
      setPessoas(lista)
      reset()
    } catch (err) {
      setErro(err.message || 'Erro ao carregar visitantes.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  if (selecionado) {
    return (
      <HistoricoVisitante
        pessoa={selecionado}
        onVoltar={() => setSelecionado(null)}
      />
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.blueDark }}>
            Visitantes cadastrados
          </h1>
          <p className="text-base mt-1" style={{ color: C.gray60 }}>
            Pessoas únicas por CPF · clique no nome para ver o histórico
            {!carregando ? ` · ${filtrada.length}` : ''}
          </p>
        </div>
        <Btn variant="secondary" icon={RefreshCw} onClick={carregar} disabled={carregando}>
          Atualizar
        </Btn>
      </div>

      {erro && <Alert type="error">{erro}</Alert>}

      <Input
        large
        value={busca}
        onChange={(e) => { setBusca(e.target.value); irPara(1) }}
        placeholder="Buscar por nome ou CPF..."
      />

      <Card>
        {carregando ? (
          <Empty>Carregando visitantes...</Empty>
        ) : itens.length === 0 ? (
          <Empty>
            <ContactRound className="mx-auto mb-2 opacity-50" size={32} />
            Nenhum visitante cadastrado.
          </Empty>
        ) : (
          <div>
            {itens.map((p) => {
              const { data, hora } = formatarDataHora(p.ultimaVisita)
              return (
                <div
                  key={p.cpf}
                  className="px-5 py-4 border-t flex items-center gap-4"
                  style={{ borderColor: C.gray3 }}
                >
                  <Avatar pessoa={p} size={56} />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="text-left text-lg font-semibold hover:underline"
                      style={{ color: C.blue }}
                      onClick={() => setSelecionado(p)}
                      title="Ver histórico de visitas"
                    >
                      {p.nome}
                    </button>
                    <div className="text-sm mt-0.5" style={{ color: C.gray60 }}>
                      CPF {p.cpf}
                    </div>
                    <div className="text-xs mt-1" style={{ color: C.gray20 }}>
                      {p.total} visita(s) · última: {data} às {hora} · {p.ultimoSetor}
                    </div>
                  </div>
                </div>
              )
            })}
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
