"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/database"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  subscription: Subscription | null
  loading: boolean
  isDemo: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    let mounted = true

    // Check if we're using the mock client
    const usingMockClient = (supabase as any)._isMockClient === true

    if (usingMockClient) {
      setIsDemo(true)
      // Set up demo data immediately
      const demoUserId = "demo-user-id"
      const demoProfile: Profile = {
        id: demoUserId,
        tipo_pessoa: "PF",
        nome: "Usuário",
        sobrenome: "Demo",
        cpf: null,
        razao_social: null,
        nome_fantasia: null,
        cnpj: null,
        nome_responsavel: null,
        email: "demo@nexaria.com",
        whatsapp: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const demoSubscription: Subscription = {
        id: "demo-subscription",
        user_id: demoUserId,
        plano: "teste_gratis",
        status: "active",
        creditos_simples: 5,
        creditos_avancados: 0,
        data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setProfile(demoProfile)
      setSubscription(demoSubscription)
      setLoading(false)
      return
    }

    // Get initial session for real Supabase
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error("Error getting session:", error)
          // If there's an auth error, switch to demo mode
          setIsDemo(true)
          setLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await Promise.all([fetchProfile(session.user.id), fetchSubscription(session.user.id)])
        }
      } catch (error) {
        console.error("Network error in getInitialSession:", error)
        // Fallback to demo mode on any network error
        setIsDemo(true)
        const demoUserId = "demo-user-id"
        const demoProfile: Profile = {
          id: demoUserId,
          tipo_pessoa: "PF",
          nome: "Usuário",
          sobrenome: "Demo",
          cpf: null,
          razao_social: null,
          nome_fantasia: null,
          cnpj: null,
          nome_responsavel: null,
          email: "demo@nexaria.com",
          whatsapp: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const demoSubscription: Subscription = {
          id: "demo-subscription",
          user_id: demoUserId,
          plano: "teste_gratis",
          status: "active",
          creditos_simples: 5,
          creditos_avancados: 0,
          data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        setProfile(demoProfile)
        setSubscription(demoSubscription)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes (only for real Supabase)
    let authSubscription: any = null

    try {
      const {
        data: { subscription: authSub },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await Promise.all([fetchProfile(session.user.id), fetchSubscription(session.user.id)])
        } else {
          setProfile(null)
          setSubscription(null)
        }
        setLoading(false)
      })

      authSubscription = authSub
    } catch (error) {
      console.error("Error setting up auth listener:", error)
    }

    return () => {
      mounted = false
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error)
        return
      }
      setProfile(data || null)
    } catch (error) {
      console.error("Network error fetching profile:", error)
      // On network error, set demo mode
      setIsDemo(true)
      const demoProfile: Profile = {
        id: userId,
        tipo_pessoa: "PF",
        nome: "Usuário",
        sobrenome: "Demo",
        cpf: null,
        razao_social: null,
        nome_fantasia: null,
        cnpj: null,
        nome_responsavel: null,
        email: "demo@nexaria.com",
        whatsapp: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setProfile(demoProfile)
    }
  }

  const fetchSubscription = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("subscriptions").select("*").eq("user_id", userId).single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching subscription:", error)
        return
      }
      setSubscription(data || null)
    } catch (error) {
      console.error("Network error fetching subscription:", error)
      // On network error, set demo mode
      setIsDemo(true)
      const demoSubscription: Subscription = {
        id: "demo-subscription",
        user_id: userId,
        plano: "teste_gratis",
        status: "active",
        creditos_simples: 5,
        creditos_avancados: 0,
        data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setSubscription(demoSubscription)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (isDemo) {
      // Demo mode - simulate successful login
      return { error: null }
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (err) {
      return { error: { message: "Network error - please try again" } }
    }
  }

  const signUp = async (email: string, password: string, userData: any) => {
    if (isDemo) {
      // Demo mode - simulate successful signup
      return { error: null }
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      })
      return { error }
    } catch (err) {
      return { error: { message: "Network error - please try again" } }
    }
  }

  const signOut = async () => {
    if (isDemo) {
      // Demo mode - just reset state
      setUser(null)
      setSession(null)
      setProfile(null)
      setSubscription(null)
      return
    }

    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error("Error signing out:", err)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (isDemo) {
      // Demo mode - simulate update
      if (profile) {
        setProfile({ ...profile, ...updates })
      }
      return { error: null }
    }

    if (!user) return { error: "No user logged in" }

    try {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)

      if (!error) {
        await fetchProfile(user.id)
      }

      return { error }
    } catch (err) {
      return { error: { message: "Network error - please try again" } }
    }
  }

  const refreshProfile = async () => {
    if (isDemo) {
      // Demo mode - nothing to refresh
      return
    }

    if (user) {
      try {
        await fetchProfile(user.id)
        await fetchSubscription(user.id)
      } catch (err) {
        console.error("Error refreshing profile:", err)
      }
    }
  }

  const value = {
    user,
    session,
    profile,
    subscription,
    loading,
    isDemo,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
