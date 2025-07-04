import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ✅ CORREÇÃO: Remover SERVICE_ROLE_KEY do cliente (SEGURANÇA)
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // ❌ REMOVIDO

// ✅ CORREÇÃO: Singleton global para evitar múltiplas instâncias
let supabaseInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null

// Cliente principal para uso no frontend
export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  supabaseInstance = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })

  return supabaseInstance
}

// ✅ CORREÇÃO: Usar o mesmo singleton
export function getSupabaseClient() {
  return createClient()
}

// Export named "supabase" for backward compatibility
export const supabase = getSupabaseClient()

// Utilitários para operações comuns
export const supabaseUtils = {
  // ✅ CORREÇÃO: Obter usuário atual com retry
  async getCurrentUser() {
    const supabase = getSupabaseClient()

    try {
      // Primeiro tentar getUser (mais confiável)
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (user && !error) {
        return { user, error: null }
      }

      // Se falhar, tentar getSession
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (session?.user) {
        return { user: session.user, error: null }
      }

      console.log("❌ [Auth] Usuário não autenticado:", error || sessionError)
      return { user: null, error: error || sessionError }
    } catch (error) {
      console.error("❌ [Auth] Erro ao obter usuário:", error)
      return { user: null, error }
    }
  },

  // Obter perfil do usuário
  async getUserProfile(userId: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) {
      console.error("Erro ao obter perfil do usuário:", error)
      return { profile: null, error }
    }

    return { profile: data, error: null }
  },

  // Obter assinatura do usuário
  async getUserSubscription(userId: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("subscriptions").select("*").eq("user_id", userId).single()

    if (error) {
      console.error("Erro ao obter assinatura do usuário:", error)
      return { subscription: null, error }
    }

    return { subscription: data, error: null }
  },

  // Verificar se o usuário tem créditos suficientes
  async hasCredits(userId: string, requiredCredits = 1) {
    const { subscription } = await this.getUserSubscription(userId)

    if (!subscription) return false

    const availableCredits = (subscription.creditos_avancados || 0) + (subscription.creditos_premium || 0)
    return availableCredits >= requiredCredits
  },

  // Consumir créditos do usuário
  async consumeCredits(userId: string, creditsToConsume = 1) {
    const supabase = getSupabaseClient()
    const { subscription } = await this.getUserSubscription(userId)

    if (!subscription) {
      return { success: false, error: "Assinatura não encontrada" }
    }

    const availableCredits = (subscription.creditos_avancados || 0) + (subscription.creditos_premium || 0)

    if (availableCredits < creditsToConsume) {
      return { success: false, error: "Créditos insuficientes" }
    }

    // Consumir créditos avançados primeiro, depois premium
    let newCreditsAvancados = subscription.creditos_avancados || 0
    let newCreditsPremium = subscription.creditos_premium || 0

    if (newCreditsAvancados >= creditsToConsume) {
      newCreditsAvancados -= creditsToConsume
    } else {
      const remaining = creditsToConsume - newCreditsAvancados
      newCreditsAvancados = 0
      newCreditsPremium -= remaining
    }

    const { error } = await supabase
      .from("subscriptions")
      .update({
        creditos_avancados: newCreditsAvancados,
        creditos_premium: newCreditsPremium,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    if (error) {
      console.error("Erro ao consumir créditos:", error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  },

  // ✅ CORREÇÃO: Verificar conectividade melhorada
  async checkConnection() {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("profiles").select("id").limit(1)

      if (error) {
        console.log("❌ [Connection] Supabase offline:", error.message)
        return false
      }

      console.log("✅ [Connection] Supabase online")
      return true
    } catch (error) {
      console.log("❌ [Connection] Erro de conectividade:", error)
      return false
    }
  },

  // ✅ CORREÇÃO: Sincronizar dados offline melhorada
  async syncOfflineData(userId: string) {
    try {
      console.log("🔄 [Sync] Iniciando sincronização offline...")

      // Obter dados do localStorage
      const localContracts = localStorage.getItem("savedContracts")
      if (!localContracts) {
        console.log("📦 [Sync] Nenhum contrato local para sincronizar")
        return { success: true, synced: 0 }
      }

      const contracts = JSON.parse(localContracts)
      if (!Array.isArray(contracts)) {
        console.log("📦 [Sync] Dados locais inválidos")
        return { success: true, synced: 0 }
      }

      const supabase = getSupabaseClient()
      let syncedCount = 0

      // Sincronizar cada contrato
      for (const contract of contracts) {
        if (contract.user_id === userId) {
          const { error } = await supabase.from("saved_contracts").upsert(contract, { onConflict: "id" })

          if (!error) {
            syncedCount++
            console.log(`✅ [Sync] Contrato ${contract.id} sincronizado`)
          } else {
            console.error(`❌ [Sync] Erro ao sincronizar ${contract.id}:`, error)
          }
        }
      }

      console.log(`🎯 [Sync] ${syncedCount} contratos sincronizados`)
      return { success: true, synced: syncedCount }
    } catch (error) {
      console.error("❌ [Sync] Erro ao sincronizar dados offline:", error)
      return { success: false, synced: 0, error }
    }
  },

  // Obter estatísticas do usuário
  async getUserStats(userId: string) {
    const supabase = getSupabaseClient()

    try {
      // Contar contratos
      const { count: contractsCount } = await supabase
        .from("saved_contracts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      // Contar perfis de prompt
      const { count: promptProfilesCount } = await supabase
        .from("prompt_profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      // Obter assinatura
      const { subscription } = await this.getUserSubscription(userId)

      return {
        contractsCount: contractsCount || 0,
        promptProfilesCount: promptProfilesCount || 0,
        availableCredits: (subscription?.creditos_avancados || 0) + (subscription?.creditos_premium || 0),
        subscriptionStatus: subscription?.status || "inactive",
        subscriptionPlan: subscription?.plano || "free",
      }
    } catch (error) {
      console.error("Erro ao obter estatísticas do usuário:", error)
      return {
        contractsCount: 0,
        promptProfilesCount: 0,
        availableCredits: 0,
        subscriptionStatus: "inactive",
        subscriptionPlan: "free",
      }
    }
  },

  // Verificar e renovar token se necessário
  async ensureValidSession() {
    const supabase = getSupabaseClient()

    try {
      // Verificar sessão atual
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionData?.session?.access_token) {
        // Verificar se o token não está próximo do vencimento
        const token = sessionData.session.access_token
        const payload = JSON.parse(atob(token.split(".")[1]))
        const expirationTime = payload.exp * 1000
        const currentTime = Date.now()
        const timeUntilExpiry = expirationTime - currentTime

        // Se expira em menos de 5 minutos, renovar
        if (timeUntilExpiry < 5 * 60 * 1000) {
          console.log("🔄 [Auth] Token próximo do vencimento, renovando...")
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

          if (refreshData?.session) {
            return { session: refreshData.session, error: null }
          } else {
            return { session: null, error: refreshError }
          }
        }

        return { session: sessionData.session, error: null }
      } else {
        // Tentar renovar sessão
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        return { session: refreshData?.session || null, error: refreshError }
      }
    } catch (error) {
      console.error("Erro ao verificar sessão:", error)
      return { session: null, error }
    }
  },
}

// Exportar cliente padrão
export default getSupabaseClient
