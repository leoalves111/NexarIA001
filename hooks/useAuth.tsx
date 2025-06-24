"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useSupabaseClient, useSessionContext, useUser } from "@supabase/auth-helpers-react"
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
  connectionStatus: "connected" | "demo" | "error" | "checking"
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabaseClient<Database>()
  const { session, isLoading: sessionLoading } = useSessionContext()
  const user = useUser()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "demo" | "error" | "checking">("checking")

  // Check if this is a mock client
  const isMockClient = (supabase as any)?._isMockClient === true

  // Setup demo data
  const setupDemoData = () => {
    const demoProfile: Profile = {
      id: "demo-user-id",
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
      id: "demo-subscription-id",
      user_id: "demo-user-id",
      plano: "teste_gratis",
      status: "active",
      creditos_simples: 5,
      creditos_avancados: 2,
      data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setProfile(demoProfile)
    setSubscription(demoSubscription)
    setIsDemo(true)
    setConnectionStatus("demo")
    setLoading(false)
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setConnectionStatus("checking")

        // If using mock client, setup demo immediately
        if (isMockClient) {
          setupDemoData()
          return
        }

        // Test connectivity with a simple query
        try {
          await supabase.from("profiles").select("id").limit(1)
          setConnectionStatus("connected")
        } catch (error) {
          setupDemoData()
          return
        }

        // Handle session state
        if (!sessionLoading && !session) {
          setProfile(null)
          setSubscription(null)
          setLoading(false)
          return
        }

        // If user is authenticated, fetch data
        if (session?.user) {
          await fetchUserData(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.warn("Auth initialization error:", error)
        setupDemoData()
      }
    }

    initializeAuth()
  }, [session, sessionLoading, isMockClient])

  // Fetch user data
  const fetchUserData = async (userId: string) => {
    if (isMockClient) {
      setupDemoData()
      return
    }

    try {
      setLoading(true)

      // Small delay to allow triggers to execute
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (profileData) {
        setProfile(profileData)
      } else if (!profileError || profileError.code === "PGRST116") {
        // Create profile if not found
        const newProfile = await createUserProfile(userId)
        if (newProfile) {
          setProfile(newProfile)
        }
      }

      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (subData) {
        setSubscription(subData)
      } else if (!subError || subError.code === "PGRST116") {
        // Create subscription if not found
        const newSubscription = await createUserSubscription(userId)
        if (newSubscription) {
          setSubscription(newSubscription)
        }
      }

      setConnectionStatus("connected")
    } catch (error) {
      console.warn("Error fetching user data:", error)
      setConnectionStatus("error")
      setupDemoData()
    } finally {
      setLoading(false)
    }
  }

  const createUserProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const userMetadata = user?.user_metadata || {}
      const email = user?.email || session?.user?.email || ""
      const emailName = email.split("@")[0]

      const profileData: Omit<Profile, "created_at" | "updated_at"> = {
        id: userId,
        tipo_pessoa: userMetadata.tipo_pessoa || "PF",
        nome: userMetadata.nome || userMetadata.first_name || emailName || "Usuário",
        sobrenome: userMetadata.sobrenome || userMetadata.last_name || "",
        cpf: userMetadata.cpf || null,
        razao_social: userMetadata.razao_social || null,
        nome_fantasia: userMetadata.nome_fantasia || null,
        cnpj: userMetadata.cnpj || null,
        nome_responsavel: userMetadata.nome_responsavel || null,
        email: email,
        whatsapp: userMetadata.whatsapp || null,
      }

      const { data, error } = await supabase.from("profiles").insert(profileData).select().single()

      return error ? null : data
    } catch (error) {
      return null
    }
  }

  const createUserSubscription = async (userId: string): Promise<Subscription | null> => {
    try {
      const subscriptionData: Omit<Subscription, "id" | "created_at" | "updated_at"> = {
        user_id: userId,
        plano: "teste_gratis",
        status: "active",
        creditos_simples: 5,
        creditos_avancados: 0,
        data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }

      const { data, error } = await supabase.from("subscriptions").insert(subscriptionData).select().single()

      return error ? null : data
    } catch (error) {
      return null
    }
  }

  const signIn = async (email: string, password: string) => {
    if (isMockClient) {
      setupDemoData()
      return { error: null }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error && error.message?.includes("refresh")) {
        // Handle refresh token errors by switching to demo
        setupDemoData()
        return { error: null }
      }

      return { error }
    } catch (err: any) {
      console.warn("Auth error, switching to demo mode:", err)
      setupDemoData()
      return { error: null }
    }
  }

  const signUp = async (email: string, password: string, userData: any) => {
    if (isMockClient) {
      setupDemoData()
      return { error: null }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...userData,
            email: email,
          },
        },
      })

      return { error }
    } catch (err) {
      setupDemoData()
      return { error: null }
    }
  }

  const signOut = async () => {
    if (isDemo || isMockClient) {
      setProfile(null)
      setSubscription(null)
      setIsDemo(false)
      setConnectionStatus("checking")
      return
    }

    try {
      await supabase.auth.signOut()
      setProfile(null)
      setSubscription(null)
    } catch (err) {
      // Silent error handling
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (isDemo || isMockClient) {
      if (profile) {
        setProfile({ ...profile, ...updates })
      }
      return { error: null }
    }

    if (!user) {
      return { error: { message: "Usuário não autenticado" } }
    }

    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("profiles").update(updateData).eq("id", user.id).select().single()

      if (error) {
        return { error }
      }

      setProfile(data)
      return { error: null }
    } catch (err) {
      return { error: { message: "Erro de rede - tente novamente" } }
    }
  }

  const refreshProfile = async () => {
    if (isDemo || isMockClient) {
      setupDemoData()
      return
    }

    if (!session?.user) return

    try {
      await fetchUserData(session.user.id)
    } catch (err) {
      // Silent error handling
    }
  }

  const value = {
    user: isDemo ? { id: "demo-user-id", email: "demo@nexaria.com" } : user,
    session: isDemo ? { user: { id: "demo-user-id", email: "demo@nexaria.com" } } : session,
    profile,
    subscription,
    loading: loading || sessionLoading,
    isDemo,
    connectionStatus,
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
