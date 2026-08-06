import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  async function carregarPerfil(userId) {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao carregar perfil:', error.message)
      setPerfil(null)
      return null
    }
    setPerfil(data)
    return data
  }

  useEffect(() => {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user) {
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha
    })
    if (error) throw error
    const p = await carregarPerfil(data.user.id)
    return { user: data.user, perfil: p }
  }

  async function logout() {
    await supabase.auth.signOut()
    setPerfil(null)
    setSession(null)
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
      isLoggedIn: !!session?.user
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
