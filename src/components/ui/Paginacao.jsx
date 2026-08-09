import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Btn } from './index.jsx'

export default function Paginacao({ pagina, totalPaginas, onChange, totalItens, rotulo = 'registro' }) {
  if (!totalItens && totalPaginas <= 1) return null

  const plural = totalItens === 1 ? rotulo : `${rotulo}s`

  return (
    <div className="px-4 sm:px-5 py-3 border-t border-gray-2 bg-gray-1 flex items-center justify-between gap-3">
      <span className="text-sm text-gray-20">
        {typeof totalItens === 'number' ? `${totalItens.toLocaleString('pt-BR')} ${plural} · ` : ''}
        página {pagina} de {Math.max(totalPaginas, 1)}
      </span>
      <div className="flex gap-1 flex-shrink-0">
        <Btn
          variant="outline"
          size="xs"
          icon={ChevronLeft}
          disabled={pagina <= 1}
          onClick={() => onChange(pagina - 1)}
          aria-label="Página anterior"
        />
        <Btn
          variant="outline"
          size="xs"
          icon={ChevronRight}
          disabled={pagina >= totalPaginas}
          onClick={() => onChange(pagina + 1)}
          aria-label="Próxima página"
        />
      </div>
    </div>
  )
}

export function usePaginacao(lista = [], porPagina = 10) {
  const [pagina, setPagina] = useState(1)
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina))

  const paginaSegura = Math.min(pagina, totalPaginas)
  const itens = useMemo(() => {
    const start = (paginaSegura - 1) * porPagina
    return lista.slice(start, start + porPagina)
  }, [lista, paginaSegura, porPagina])

  function irPara(p) {
    setPagina(Math.max(1, Math.min(totalPaginas, p)))
  }

  function reset() {
    setPagina(1)
  }

  return { pagina: paginaSegura, totalPaginas, itens, irPara, reset, setPagina: irPara }
}
