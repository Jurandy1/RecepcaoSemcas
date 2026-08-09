import { useEffect, useState } from 'react'
import { Input, Select } from '../ui'
const OUTRO = '__outro__'

/** Select da lista + opção Outro para digitar livremente. */
export function CampoSetorProcurado({
  value,
  onChange,
  setores = [],
  large,
  inputRef,
  placeholder = 'Ex.: Gabinete, Recursos Humanos...',
}) {
  const naLista = setores.some((s) => s.nome === value)
  const [modoOutro, setModoOutro] = useState(() => Boolean(value && !naLista))

  useEffect(() => {
    if (value && !setores.some((s) => s.nome === value)) {
      setModoOutro(true)
    }
  }, [value, setores])

  if (!setores.length) {
    return (
      <Input
        ref={inputRef}
        large={large}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )
  }

  const selectValue = modoOutro ? OUTRO : (value || '')

  return (
    <div className="space-y-2">
      <Select
        large={large}
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value
          if (v === OUTRO) {
            setModoOutro(true)
            if (naLista) onChange('')
          } else {
            setModoOutro(false)
            onChange(v)
          }
        }}
      >
        <option value="">Selecione o setor...</option>
        {setores.map((s) => (
          <option key={s.id} value={s.nome}>{s.nome}</option>
        ))}
        <option value={OUTRO}>Outro (digitar)</option>
      </Select>
      {modoOutro && (
        <Input
          ref={inputRef}
          large={large}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      )}
    </div>
  )
}
