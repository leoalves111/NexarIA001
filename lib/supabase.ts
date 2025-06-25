import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if we're in a browser environment and have the required env vars
const isSupabaseConfigured = () => {
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "your-supabase-url" &&
    supabaseAnonKey !== "your-supabase-anon-key" &&
    supabaseUrl.startsWith("https://") &&
    supabaseAnonKey.length > 20
  )
}

// Single client instance
let clientInstance: any = null

// Create client function
export const createSupabaseClient = () => {
  // Return existing instance if available
  if (clientInstance) {
    return clientInstance
  }

  // Check if we're in browser environment
  if (typeof window === "undefined") {
    return null
  }

  // Check configuration
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured properly")
    return null
  }

  try {
    // Create the client using auth helpers
    clientInstance = createClientComponentClient<Database>()
    return clientInstance
  } catch (error) {
    console.error("Failed to create Supabase client:", error)
    return null
  }
}

// Export the client
export const supabase = createSupabaseClient()

// Simplified auth helpers
export const auth = {
  signUp: async (email: string, password: string, userData: any) => {
    const client = createSupabaseClient()
    if (!client) {
      return { data: null, error: { message: "Supabase not configured" } }
    }

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: userData },
      })
      return { data, error }
    } catch (err) {
      console.error("SignUp error:", err)
      return { data: null, error: err }
    }
  },

  signIn: async (email: string, password: string) => {
    const client = createSupabaseClient()
    if (!client) {
      return { data: null, error: { message: "Supabase not configured" } }
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    } catch (err) {
      console.error("SignIn error:", err)
      return { data: null, error: err }
    }
  },

  signOut: async () => {
    const client = createSupabaseClient()
    if (!client) {
      return { error: { message: "Supabase not configured" } }
    }

    try {
      const { error } = await client.auth.signOut()
      // Clear the client instance on sign out
      clientInstance = null
      return { error }
    } catch (err) {
      console.error("SignOut error:", err)
      return { error: err }
    }
  },

  resetPassword: async (email: string) => {
    const client = createSupabaseClient()
    if (!client || typeof window === "undefined") {
      return { data: null, error: { message: "Supabase not configured" } }
    }

    try {
      const { data, error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      return { data, error }
    } catch (err) {
      console.error("Reset password error:", err)
      return { data: null, error: err }
    }
  },

  getSession: async () => {
    const client = createSupabaseClient()
    if (!client) {
      return { session: null, error: { message: "Supabase not configured" } }
    }

    try {
      const {
        data: { session },
        error,
      } = await client.auth.getSession()
      return { session, error }
    } catch (err) {
      console.error("Get session error:", err)
      return { session: null, error: err }
    }
  },

  getUser: async () => {
    const client = createSupabaseClient()
    if (!client) {
      return { user: null, error: { message: "Supabase not configured" } }
    }

    try {
      const {
        data: { user },
        error,
      } = await client.auth.getUser()
      return { user, error }
    } catch (err) {
      console.error("Get user error:", err)
      return { user: null, error: err }
    }
  },
}
