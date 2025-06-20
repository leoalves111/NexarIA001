"use client"

import type React from "react"

import { useState } from "react"
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs"
import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/hooks/useAuth"
import { Toaster } from "@/components/ui/toast"
import type { Database } from "@/types/database"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Use createPagesBrowserClient instead of deprecated function
  const [supabaseClient] = useState(() =>
    createPagesBrowserClient<Database>({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }),
  )

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={null}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </SessionContextProvider>
  )
}
