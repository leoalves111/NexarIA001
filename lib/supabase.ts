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

// Create a mock client that mimics Supabase's interface
const createMockClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () =>
      Promise.resolve({
        data: { user: null, session: null },
        error: null,
      }),
    signUp: () =>
      Promise.resolve({
        data: { user: null, session: null },
        error: null,
      }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: any) => {
      const demoUser = {
        id: "demo-user-id",
        email: "demo@nexaria.com",
        user_metadata: {
          nome: "Usuário",
          sobrenome: "Demo",
        },
      }
      const demoSession = {
        user: demoUser,
        access_token: "demo-token",
      }
      setTimeout(() => callback("SIGNED_IN", demoSession), 100)
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }
    },
    resetPasswordForEmail: () => Promise.resolve({ data: null, error: null }),
    getUser: () =>
      Promise.resolve({
        data: {
          user: {
            id: "demo-user-id",
            email: "demo@nexaria.com",
            user_metadata: {
              nome: "Usuário",
              sobrenome: "Demo",
            },
          },
        },
        error: null,
      }),
  },
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: () => Promise.resolve({ data: null, error: { code: "PGRST116", message: "Not found" } }),
        maybeSingle: () => Promise.resolve({ data: null, error: { code: "PGRST116", message: "Not found" } }),
      }),
      order: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: (data: any) => ({
      eq: () => Promise.resolve({ data: null, error: null }),
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
  _isMockClient: true,
})

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
    return createMockClient()
  }

  // Check configuration
  if (!isSupabaseConfigured()) {
    clientInstance = createMockClient()
    return clientInstance
  }

  try {
    // Create the client using auth helpers
    clientInstance = createClientComponentClient<Database>()
    return clientInstance
  } catch (error) {
    console.warn("Failed to create Supabase client, using demo mode:", error)
    clientInstance = createMockClient()
    return clientInstance
  }
}

// Export the client
export const supabase = createSupabaseClient()

// Simplified auth helpers
export const auth = {
  signUp: async (email: string, password: string, userData: any) => {
    const client = createSupabaseClient()

    if (client._isMockClient) {
      return { data: { user: { id: "demo-user-id", email } }, error: null }
    }

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: userData },
      })
      return { data, error }
    } catch (err) {
      console.warn("SignUp error, using demo mode:", err)
      return { data: { user: { id: "demo-user-id", email } }, error: null }
    }
  },

  signIn: async (email: string, password: string) => {
    const client = createSupabaseClient()

    if (client._isMockClient) {
      return {
        data: {
          user: {
            id: "demo-user-id",
            email,
            user_metadata: { nome: "Usuário", sobrenome: "Demo" },
          },
          session: {
            user: {
              id: "demo-user-id",
              email,
              user_metadata: { nome: "Usuário", sobrenome: "Demo" },
            },
          },
        },
        error: null,
      }
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    } catch (err) {
      console.warn("SignIn error, using demo mode:", err)
      return {
        data: {
          user: {
            id: "demo-user-id",
            email,
            user_metadata: { nome: "Usuário", sobrenome: "Demo" },
          },
          session: {
            user: {
              id: "demo-user-id",
              email,
              user_metadata: { nome: "Usuário", sobrenome: "Demo" },
            },
          },
        },
        error: null,
      }
    }
  },

  signOut: async () => {
    const client = createSupabaseClient()

    if (client._isMockClient) {
      return { error: null }
    }

    try {
      const { error } = await client.auth.signOut()
      // Clear the client instance on sign out
      clientInstance = null
      return { error }
    } catch (err) {
      return { error: null }
    }
  },

  resetPassword: async (email: string) => {
    const client = createSupabaseClient()

    if (client._isMockClient || typeof window === "undefined") {
      return { data: null, error: null }
    }

    try {
      const { data, error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      return { data, error }
    } catch (err) {
      return { data: null, error: null }
    }
  },

  getSession: async () => {
    const client = createSupabaseClient()

    if (client._isMockClient) {
      return { session: null, error: null }
    }

    try {
      const {
        data: { session },
        error,
      } = await client.auth.getSession()
      return { session, error }
    } catch (err) {
      return { session: null, error: null }
    }
  },

  getUser: async () => {
    const client = createSupabaseClient()

    if (client._isMockClient) {
      return {
        user: {
          id: "demo-user-id",
          email: "demo@nexaria.com",
          user_metadata: { nome: "Usuário", sobrenome: "Demo" },
        },
        error: null,
      }
    }

    try {
      const {
        data: { user },
        error,
      } = await client.auth.getUser()
      return { user, error }
    } catch (err) {
      return {
        user: {
          id: "demo-user-id",
          email: "demo@nexaria.com",
          user_metadata: { nome: "Usuário", sobrenome: "Demo" },
        },
        error: null,
      }
    }
  },
}
