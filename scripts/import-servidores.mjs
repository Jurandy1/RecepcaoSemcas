/**
 * Importa data/servidores.csv para public.servidores.
 * Uso (local):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-servidores.mjs
 *
 * NÃO use a service_role no frontend nem no Vercel.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Defina SUPABASE_URL (ou VITE_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const csvPath = process.env.SERVIDORES_CSV
  || path.join(root, 'data', 'servidores.csv')

if (!fs.existsSync(csvPath)) {
  console.error('CSV não encontrado:', csvPath)
  process.exit(1)
}

function parseDataBr(str = '') {
  const m = String(str).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';')
    if (parts.length < 3) continue
    const lotacao = (parts[0] || '').trim()
    const matricula = (parts[1] || '').trim()
    const nome = (parts[2] || '').trim()
    if (!lotacao || !matricula || !nome) continue
    rows.push({
      lotacao,
      matricula,
      nome,
      cargo: (parts[3] || '').trim() || null,
      cargo_comissionado: (parts[4] || '').trim() || null,
      admissao: parseDataBr(parts[5] || '') || null,
      ativo: true,
    })
  }
  return rows
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const raw = fs.readFileSync(csvPath)
// tenta utf-8; se vier latin1 bagunçado, ainda importa os campos principais
let text = raw.toString('utf8')
if (text.includes('�') || /Lota../.test(text.slice(0, 40))) {
  text = raw.toString('latin1')
}

const rows = parseCsv(text)
console.log(`Lidos ${rows.length} servidores de ${csvPath}`)

const BATCH = 500
let ok = 0
let falhas = 0

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error } = await supabase
    .from('servidores')
    .upsert(batch, {
      onConflict: 'matricula,lotacao',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error(`Lote ${i}-${i + batch.length}:`, error.message)
    falhas += batch.length
  } else {
    ok += batch.length
    console.log(`Importados ${ok}/${rows.length}`)
  }
}

console.log(`Concluído. OK=${ok} falhas=${falhas}`)
console.log('Obs.: upsert não apaga CPF já preenchido se você usar update parcial — neste script o upsert envia só campos do CSV (sem cpf).')
