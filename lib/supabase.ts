import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if we're in a browser environment and have the required env vars
const isSupabaseConfigured = typeof window !== "undefined" && supabaseUrl && supabaseAnonKey

// Create a mock client that mimics Supabase's interface
const createMockClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () =>
      Promise.resolve({
        data: { user: null, session: null },
        error: { message: "Supabase not configured - using demo mode" },
      }),
    signUp: () =>
      Promise.resolve({
        data: { user: null, session: null },
        error: { message: "Supabase not configured - using demo mode" },
      }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: any) => {
      // Simulate auth state change for demo
      setTimeout(() => {
        callback("SIGNED_OUT", null)
      }, 100)
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }
    },
    resetPasswordForEmail: () =>
      Promise.resolve({
        data: null,
        error: { message: "Supabase not configured - using demo mode" },
      }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  },
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: () => {
          // Return mock data based on table
          if (table === "profiles") {
            return Promise.resolve({
              data: null,
              error: { code: "PGRST116", message: "Not found" },
            })
          }
          if (table === "subscriptions") {
            return Promise.resolve({
              data: null,
              error: { code: "PGRST116", message: "Not found" },
            })
          }
          return Promise.resolve({ data: null, error: { code: "PGRST116", message: "Not found" } })
        },
      }),
      order: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () =>
      Promise.resolve({
        data: null,
        error: { message: "Supabase not configured - using demo mode" },
      }),
    update: (data: any) => ({
      eq: () =>
        Promise.resolve({
          data: null,
          error: { message: "Supabase not configured - using demo mode" },
        }),
    }),
    delete: () => ({
      eq: () =>
        Promise.resolve({
          data: null,
          error: { message: "Supabase not configured - using demo mode" },
        }),
    }),
  }),
  // Add a flag to identify this as a mock client
  _isMockClient: true,
})

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : (createMockClient() as any)

// Client-side auth helpers
export const auth = {
  signUp: async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      })
      return { data, error }
    } catch (err) {
      return { data: null, error: { message: "Network error - using demo mode" } }
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    } catch (err) {
      return { data: null, error: { message: "Network error - using demo mode" } }
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (err) {
      return { error: null }
    }
  },

  resetPassword: async (email: string) => {
    if (typeof window === "undefined") {
      return { data: null, error: { message: "Window not available" } }
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      return { data, error }
    } catch (err) {
      return { data: null, error: { message: "Network error - using demo mode" } }
    }
  },

  getSession: async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()
      return { session, error }
    } catch (err) {
      return { session: null, error: null }
    }
  },

  getUser: async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      return { user, error }
    } catch (err) {
      return { user: null, error: null }
    }
  },
}
