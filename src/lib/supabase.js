import { createClient } from '@supabase/supabase-js'

function lerConfig() {
  const runtime = (typeof window !== 'undefined' && window.__SEMCAS_CONFIG__) || {}
  return {
    url: runtime.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: runtime.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  }
}

const { url: supabaseUrl, anonKey: supabaseAnonKey } = lerConfig()

export const supabaseConfigured = Boolean(
  supabaseUrl
  && supabaseAnonKey
  && !supabaseUrl.includes('seu-projeto')
  && supabaseAnonKey !== 'sua_chave_anon_publica'
)

if (!supabaseConfigured) {
  console.warn('Supabase: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em public/config.js ou no arquivo .env')
}

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
