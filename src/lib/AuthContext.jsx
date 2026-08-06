import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from './supabase'

const ADMIN_UID = '4a511454-6452-41da-9f37-270cdc5a6f99'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessaoExpirada, setSessaoExpirada] = useState(false)

  async function carregarPerfil(userId) {
    if (!supabase) return null

    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao carregar perfil:', error.message)
      const m = (error.message || '').toLowerCase()
      if (m.includes('jwt') || m.includes('session') || error.code === 'PGRST301') {
        setSessaoExpirada(true)
      }
    }

    if (data) {
      setPerfil(data)
      return data
    }

    // Admin geral: cria perfil automaticamente se faltar
    if (userId === ADMIN_UID) {
      const { data: criado, error: rpcError } = await supabase.rpc('garantir_perfil_admin')
      if (!rpcError && criado) {
        setPerfil(criado)
        return criado
      }
      if (rpcError) {
        console.error('garantir_perfil_admin:', rpcError.message)
      }
    }

    setPerfil(null)
    return null
  }

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setLoading(false)
      return undefined
    }

    let mounted = true

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      if (s?.user) {
        carregarPerfil(s.user.id).finally(() => mounted && setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_OUT') {
        setPerfil(null)
        setSessaoExpirada(true)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSessaoExpirada(false)
        if (s?.user) carregarPerfil(s.user.id)
      } else if (s?.user) {
        carregarPerfil(s.user.id)
      } else {
        setPerfil(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function login(email, senha) {
    if (!supabase) throw new Error('Supabase não configurado.')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha
    })
    if (error) throw error
    setSessaoExpirada(false)
    setSession(data.session)
    const p = await carregarPerfil(data.user.id)
    return { user: data.user, perfil: p }
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut()
    setPerfil(null)
    setSession(null)
    setSessaoExpirada(false)
  }

  async function refreshPerfil() {
    if (session?.user) return carregarPerfil(session.user.id)
    return null
  }

  const ehGestor = perfil?.papel === 'admin' || perfil?.papel === 'coordenadora'

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      perfil,
      loading,
      login,
      logout,
      refreshPerfil,
      ehGestor,
      isLoggedIn: !!session?.user,
      supabaseConfigured,
      sessaoExpirada,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
