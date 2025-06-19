"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useSessionContext, useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import type { Database } from "@/types/database"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]

interface AuthContextType {
  user: any
  session: any
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
  const supabase = useSupabaseClient<Database>()
  const sessionContext = useSessionContext()
  const session = sessionContext.session
  const sessionLoading = sessionContext.isLoading
  const user = useUser()

  const hasSupabaseConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(!hasSupabaseConfig)

  const setupDemoMode = () => {
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
    setLoading(false)
  }

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setupDemoMode()
      return
    }

    if (!supabase) {
      setupDemoMode()
      return
    }

    if (!sessionLoading && !session) {
      setLoading(false)
      return
    }

    if (user && session && typeof window !== "undefined") {
      fetchUserData(user.id)
    } else {
      setLoading(false)
    }
  }, [user, session, sessionLoading, hasSupabaseConfig, supabase])

  const fetchUserData = async (userId: string) => {
    try {
      const profilePromise = fetchWithTimeout(
        () => supabase.from("profiles").select("*").eq("id", userId).single(),
        5000,
      )

      const subscriptionPromise = fetchWithTimeout(
        () => supabase.from("subscriptions").select("*").eq("user_id", userId).single(),
        5000,
      )

      const [profileResult, subscriptionResult] = await Promise.allSettled([profilePromise, subscriptionPromise])

      if (profileResult.status === "fulfilled") {
        const { data, error } = profileResult.value
        if (!error || error.code === "PGRST116") {
          setProfile(data || null)
        }
      }

      if (subscriptionResult.status === "fulfilled") {
        const { data, error } = subscriptionResult.value
        if (!error || error.code === "PGRST116") {
          setSubscription(data || null)
        }
      }

      // Se não encontrou perfil, criar um baseado nos dados do usuário
      if (profileResult.status === "fulfilled" && !profileResult.value.data && user) {
        const userMetadata = user.user_metadata || {}
        const email = user.email || ""

        // Extrair nome do email se não houver metadata
        const emailName = email.split("@")[0]
        const firstName = userMetadata.nome || userMetadata.first_name || emailName || "Usuário"
        const lastName = userMetadata.sobrenome || userMetadata.last_name || ""

        const newProfile: Profile = {
          id: userId,
          tipo_pessoa: userMetadata.tipo_pessoa || "PF",
          nome: firstName,
          sobrenome: lastName,
          cpf: userMetadata.cpf || null,
          razao_social: userMetadata.razao_social || null,
          nome_fantasia: userMetadata.nome_fantasia || null,
          cnpj: userMetadata.cnpj || null,
          nome_responsavel: userMetadata.nome_responsavel || null,
          email: email,
          whatsapp: userMetadata.whatsapp || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        setProfile(newProfile)

        // Tentar criar o perfil no banco (silenciosamente)
        try {
          await supabase.from("profiles").insert(newProfile)
        } catch (err) {
          // Ignorar erro de criação
        }
      }

      // Se não encontrou subscription, criar uma padrão
      if (subscriptionResult.status === "fulfilled" && !subscriptionResult.value.data) {
        const newSubscription: Subscription = {
          id: `sub-${userId}`,
          user_id: userId,
          plano: "teste_gratis",
          status: "active",
          creditos_simples: 5,
          creditos_avancados: 0,
          data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        setSubscription(newSubscription)

        // Tentar criar a subscription no banco (silenciosamente)
        try {
          await supabase.from("subscriptions").insert(newSubscription)
        } catch (err) {
          // Ignorar erro de criação
        }
      }

      setLoading(false)
    } catch (error) {
      setLoading(false)
    }
  }

  const fetchWithTimeout = (fetchFn: () => Promise<any>, timeout: number) => {
    return Promise.race([
      fetchFn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
    ])
  }

  const signIn = async (email: string, password: string) => {
    if (isDemo || !supabase) {
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
    if (isDemo || !supabase) {
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
    if (isDemo || !supabase) {
      setProfile(null)
      setSubscription(null)
      return
    }

    try {
      await supabase.auth.signOut()
      setProfile(null)
      setSubscription(null)
    } catch (err) {
      // Ignorar erro de logout
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (isDemo || !supabase) {
      if (profile) {
        setProfile({ ...profile, ...updates })
      }
      return { error: null }
    }

    if (!user) return { error: "No user logged in" }

    try {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)

      if (!error && typeof window !== "undefined") {
        await fetchUserData(user.id)
      }

      return { error }
    } catch (err) {
      return { error: { message: "Network error - please try again" } }
    }
  }

  const refreshProfile = async () => {
    if (isDemo || !supabase || !user || typeof window === "undefined") return

    try {
      await fetchUserData(user.id)
    } catch (err) {
      // Ignorar erro de refresh
    }
  }

  const value = {
    user,
    session,
    profile,
    subscription,
    loading: loading || sessionLoading,
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
