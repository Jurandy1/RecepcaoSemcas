import { supabase } from './supabase'
import { somenteDigitos } from './br'

/**
 * Envia foto (data URL) para o Storage e devolve a URL pública.
 * Se já for URL http(s) ou o upload falhar, devolve o valor original (compatível com base64 antigo).
 */
export async function salvarFotoVisitante(foto, cpf = '') {
  if (!foto) return null
  if (!supabase) return foto
  if (typeof foto === 'string' && !foto.startsWith('data:')) return foto

  try {
    const res = await fetch(foto)
    const blob = await res.blob()
    const pasta = somenteDigitos(cpf) || 'sem-cpf'
    const path = `${pasta}/${Date.now()}.jpg`

    const { error } = await supabase.storage
      .from('visitantes-fotos')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) {
      console.warn('Storage de foto falhou; mantendo data URL:', error.message)
      return foto
    }

    const { data } = supabase.storage.from('visitantes-fotos').getPublicUrl(path)
    return data?.publicUrl || foto
  } catch (err) {
    console.warn('Storage de foto falhou; mantendo data URL:', err?.message || err)
    return foto
  }
}
