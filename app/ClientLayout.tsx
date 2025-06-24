"use client"

import type React from "react"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { AuthProvider } from "@/hooks/useAuth"
import { useState } from "react"
import type { Database } from "@/types/database"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [supabaseClient] = useState(() => {
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const isConfigured = !!(
      supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== "your-supabase-url" &&
      supabaseAnonKey !== "your-supabase-anon-key" &&
      supabaseUrl.startsWith("https://") &&
      supabaseAnonKey.length > 20
    )

    if (!isConfigured) {
      // Return a mock client for demo mode
      return {
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: (callback: any) => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
        },
        _isMockClient: true,
      } as any
    }

    try {
      return createClientComponentClient<Database>()
    } catch (error) {
      console.warn("Failed to create Supabase client, using demo mode")
      return {
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: (callback: any) => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
        },
        _isMockClient: true,
      } as any
    }
  })

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={null}>
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </SessionContextProvider>
  )
}
