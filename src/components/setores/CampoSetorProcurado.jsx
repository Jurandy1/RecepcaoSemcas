import { useId } from 'react'
import { Input } from '../ui'

/** Campo pesquisável que também permite informar um setor fora da lista. */
export function CampoSetorProcurado({
  value,
  onChange,
  setores = [],
  large,
  inputRef,
  placeholder = 'Ex.: Gabinete, Recursos Humanos...',
}) {
  const listId = useId()

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        large={large}
        list={setores.length ? listId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {setores.length > 0 && (
        <datalist id={listId}>
        {setores.map((s) => (
          <option key={s.id} value={s.nome}>{s.nome}</option>
        ))}
        </datalist>
      )}
      <p className="text-xs text-gray-20">
        Digite para pesquisar. Se não encontrar, informe o nome do setor manualmente.
      </p>
    </div>
  )
}
