/**
 * Garante que public/config.js exista no build (ex.: Vercel).
 * Em produção use as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
 * no painel do Vercel — este arquivo só evita o 404 do script opcional.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = join(root, 'public', 'config.js')

if (!existsSync(target)) {
  writeFileSync(
    target,
    `// Gerado no build — preencha localmente ou use variáveis VITE_* no Vercel.
window.__SEMCAS_CONFIG__ = window.__SEMCAS_CONFIG__ || {
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
}
`
  )
  console.log('public/config.js criado (vazio). Use VITE_* no Vercel ou preencha localmente.')
}
