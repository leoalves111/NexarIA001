"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useRef } from "react"
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
  connectionStatus: "connected" | "error" | "checking"
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
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "error" | "checking">("checking")

  // CORREÇÃO: Prevenir race conditions
  const fetchingRef = useRef(false)
  const initializingRef = useRef(false)

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      // CORREÇÃO: Prevenir múltiplas inicializações simultâneas
      if (initializingRef.current) return
      initializingRef.current = true

      try {
        setConnectionStatus("checking")

        // Test connectivity with a simple query
        try {
          const { data, error } = await supabase.from("profiles").select("id").limit(1)
          if (error && error.code !== "PGRST116") throw error
          setConnectionStatus("connected")
        } catch (error) {
          console.error("Database connection error:", error)
          setConnectionStatus("error")
          setLoading(false)
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
        if (session?.user && !fetchingRef.current) {
          await fetchUserData(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        setConnectionStatus("error")
        setLoading(false)
      } finally {
        initializingRef.current = false
      }
    }

    initializeAuth()
  }, [session, sessionLoading, supabase])

  // Fetch user data
  const fetchUserData = async (userId: string) => {
    // CORREÇÃO: Prevenir múltiplas chamadas simultâneas
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      setLoading(true)

      // Small delay to allow triggers to execute
      await new Promise((resolve) => setTimeout(resolve, 500))

      // CORREÇÃO: Buscar dados em paralelo com Promise.allSettled
      const [profileResult, subscriptionResult] = await Promise.allSettled([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
      ])

      // Handle profile
      if (profileResult.status === "fulfilled") {
        const { data: profileData, error: profileError } = profileResult.value

        if (profileData) {
          setProfile(profileData)
        } else if (!profileError || profileError.code === "PGRST116") {
          // Create profile if not found
          const newProfile = await createUserProfile(userId)
          if (newProfile) {
            setProfile(newProfile)
          }
        } else {
          console.error("Profile fetch error:", profileError)
        }
      }

      // Handle subscription
      if (subscriptionResult.status === "fulfilled") {
        const { data: subData, error: subError } = subscriptionResult.value

        if (subData) {
          setSubscription(subData)
        } else if (!subError || subError.code === "PGRST116") {
          // Create subscription if not found
          const newSubscription = await createUserSubscription(userId)
          if (newSubscription) {
            setSubscription(newSubscription)
          }
        } else {
          console.error("Subscription fetch error:", subError)
        }
      }

      setConnectionStatus("connected")
    } catch (error) {
      console.error("Error fetching user data:", error)
      setConnectionStatus("error")
    } finally {
      setLoading(false)
      fetchingRef.current = false
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

      // CORREÇÃO: Usar upsert para evitar conflitos
      const { data, error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "id" })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating profile:", error)
      return null
    }
  }

  const createUserSubscription = async (userId: string): Promise<Subscription | null> => {
    try {
      const subscriptionData: Omit<Subscription, "id" | "created_at" | "updated_at"> = {
        user_id: userId,
        plano: "teste_gratis",
        status: "active",
        creditos_avancados: 10,
        data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }

      // CORREÇÃO: Usar upsert para evitar conflitos
      const { data, error } = await supabase
        .from("subscriptions")
        .upsert(subscriptionData, { onConflict: "user_id" })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating subscription:", error)
      return null
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      // CORREÇÃO: Validação de entrada
      if (!email || !password) {
        throw new Error("Email e senha são obrigatórios")
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) throw error
      return { error: null }
    } catch (err: any) {
      console.error("Auth error:", err)
      return { error: err }
    }
  }

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      // CORREÇÃO: Validação de entrada
      if (!email || !password) {
        throw new Error("Email e senha são obrigatórios")
      }

      if (password.length < 6) {
        throw new Error("Senha deve ter pelo menos 6 caracteres")
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            ...userData,
            email: email.trim().toLowerCase(),
          },
        },
      })

      if (error) throw error
      return { error: null }
    } catch (err: any) {
      console.error("SignUp error:", err)
      return { error: err }
    }
  }

  const signOut = async () => {
    try {
      // CORREÇÃO: Limpar estado local antes do signOut
      setProfile(null)
      setSubscription(null)
      setLoading(false)

      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      console.error("SignOut error:", err)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user?.id) throw new Error("No user")

      // CORREÇÃO: Validar dados antes de atualizar
      const sanitizedUpdates = Object.fromEntries(Object.entries(updates).filter(([_, value]) => value !== undefined))

      const { error } = await supabase
        .from("profiles")
        .update({
          ...sanitizedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error
      await refreshProfile()
      return { error: null }
    } catch (err: any) {
      console.error("Profile update error:", err)
      return { error: err }
    }
  }

  const refreshProfile = async () => {
    if (user?.id && !fetchingRef.current) {
      await fetchUserData(user.id)
    }
  }

  const value = {
    user,
    session,
    profile,
    subscription,
    loading,
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
