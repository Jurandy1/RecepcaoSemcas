import { useEffect, useId, useMemo, useState } from 'react'
import { Building2, Check, ChevronDown, MapPin, Pencil, Search } from 'lucide-react'
import { Input } from '../ui'

function normalizar(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Seletor pesquisável que também aceita um setor digitado manualmente. */
export function CampoSetorProcurado({
  value,
  onChange,
  setores = [],
  large,
  inputRef,
  placeholder = 'Pesquise ou digite o setor...',
}) {
  const listId = useId()
  const [aberto, setAberto] = useState(false)
  const [indiceAtivo, setIndiceAtivo] = useState(0)
  const busca = normalizar(value)

  const resultados = useMemo(() => {
    const encontrados = setores
      .filter((setor) => !busca || normalizar(setor.nome).includes(busca))
      .sort((a, b) => {
        const aComeca = normalizar(a.nome).startsWith(busca)
        const bComeca = normalizar(b.nome).startsWith(busca)
        if (aComeca !== bComeca) return aComeca ? -1 : 1
        return a.nome.localeCompare(b.nome, 'pt-BR')
      })
    return encontrados.slice(0, 12)
  }, [busca, setores])

  const correspondenciaExata = setores.some(
    (setor) => normalizar(setor.nome) === busca && busca
  )
  const permiteManual = Boolean(value.trim() && !correspondenciaExata)

  useEffect(() => {
    setIndiceAtivo(0)
  }, [busca])

  function selecionar(nome) {
    onChange(nome)
    setAberto(false)
  }

  function aoTeclar(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setAberto(true)
      setIndiceAtivo((atual) => Math.min(atual + 1, Math.max(0, resultados.length - 1)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIndiceAtivo((atual) => Math.max(atual - 1, 0))
    } else if (event.key === 'Enter' && aberto && resultados[indiceAtivo]) {
      event.preventDefault()
      selecionar(resultados[indiceAtivo].nome)
    } else if (event.key === 'Escape') {
      setAberto(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          size={19}
          className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-gray-20 pointer-events-none"
        />
        <Input
          ref={inputRef}
          large={large}
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setAberto(true)
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          onKeyDown={aoTeclar}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={aberto}
          aria-controls={listId}
          style={{ paddingLeft: 44, paddingRight: 44 }}
        />
        <ChevronDown
          size={19}
          className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-20 pointer-events-none transition-transform ${aberto ? 'rotate-180' : ''}`}
        />

        {aberto && setores.length > 0 && (
          <div
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-gray-3 bg-white shadow-e3"
          >
            <div className="flex items-center justify-between border-b border-gray-2 bg-canvas px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-60">
                {busca ? 'Resultados' : 'Setores disponíveis'}
              </span>
              <span className="text-xs text-gray-20">
                {resultados.length}{resultados.length === 12 ? '+' : ''}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto p-1.5">
              {resultados.map((setor, index) => {
                const selecionado = normalizar(setor.nome) === busca
                const auditorio = normalizar(setor.nome).includes('auditorio')
                return (
                  <button
                    key={setor.id}
                    type="button"
                    role="option"
                    aria-selected={selecionado}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      index === indiceAtivo ? 'bg-blue-10' : 'hover:bg-gray-2'
                    }`}
                    onMouseEnter={() => setIndiceAtivo(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selecionar(setor.nome)}
                  >
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${auditorio ? 'bg-blue text-white' : 'bg-blue-10 text-blue'}`}>
                      {auditorio ? <MapPin size={17} /> : <Building2 size={17} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-blue-dark">
                        {setor.nome}
                      </span>
                      {auditorio && (
                        <span className="mt-0.5 block text-xs text-gray-20">Auditório com andar identificado</span>
                      )}
                    </span>
                    {selecionado && <Check size={18} className="flex-shrink-0 text-success" />}
                  </button>
                )
              })}

              {!resultados.length && (
                <div className="px-4 py-5 text-center">
                  <div className="text-sm font-semibold text-gray-60">Nenhum setor encontrado</div>
                  <div className="mt-1 text-xs text-gray-20">Você ainda pode usar o nome digitado.</div>
                </div>
              )}
            </div>

            {permiteManual && (
              <button
                type="button"
                className="flex w-full items-center gap-3 border-t border-gray-2 bg-white px-4 py-3 text-left hover:bg-blue-10"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setAberto(false)}
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-2 text-gray-60">
                  <Pencil size={15} />
                </span>
                <span className="min-w-0 text-sm text-gray-60">
                  Usar <strong className="text-blue-dark">“{value.trim()}”</strong> como setor digitado
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-20">
        Pesquise na lista ou digite livremente o nome do setor.
      </p>
    </div>
  )
}
