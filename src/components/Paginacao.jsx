import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { C } from '../lib/theme'
import { Btn } from './ui'

export default function Paginacao({ pagina, totalPaginas, onChange, totalItens }) {
  if (totalPaginas <= 1) return null

  return (
    <div className="px-5 py-3 border-t flex items-center justify-between gap-3" style={{ borderColor: C.gray3 }}>
      <div className="text-sm" style={{ color: C.gray60 }}>
        Página {pagina} de {totalPaginas}
        {typeof totalItens === 'number' ? ` · ${totalItens} registro(s)` : ''}
      </div>
      <div className="flex items-center gap-2">
        <Btn
          variant="secondary"
          size="sm"
          icon={ChevronLeft}
          disabled={pagina <= 1}
          onClick={() => onChange(pagina - 1)}
        >
          Anterior
        </Btn>
        <Btn
          variant="secondary"
          size="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => onChange(pagina + 1)}
        >
          Próxima <ChevronRight size={14} />
        </Btn>
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
