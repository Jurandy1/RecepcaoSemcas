/** Utilitários de CPF e telefone BR */

export function somenteDigitos(valor = '') {
  return String(valor).replace(/\D/g, '')
}

export function formatCpf(valor = '') {
  const d = somenteDigitos(valor).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function maskCpf(valor) {
  return formatCpf(valor)
}

/** Exibição após cadastro: só os 3 últimos dígitos visíveis. */
export function maskCpfExibicao(valor = '') {
  const d = somenteDigitos(valor)
  if (!d) return '—'
  if (d.length < 3) return '***'
  return `***.***.***-${d.slice(-3)}`
}

export function cpfValido(valor = '') {
  const cpf = somenteDigitos(valor)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== Number(cpf[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  return resto === Number(cpf[10])
}

export function maskTelefoneBr(valor = '') {
  const d = somenteDigitos(valor).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function telefoneBrValido(valor = '') {
  if (!valor || !String(valor).trim()) return true
  const d = somenteDigitos(valor)
  return d.length === 10 || d.length === 11
}

export function parseDataBr(str = '') {
  // DD/MM/YYYY
  const m = String(str).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  const d = new Date(iso + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? null : iso
}
