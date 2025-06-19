"use client"

import type React from "react"

import { useState } from "react"
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs"
import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/hooks/useAuth"
import { Toaster } from "@/components/ui/toaster"
import type { Database } from "@/types/database"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient<Database>())

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SessionContextProvider supabaseClient={supabaseClient}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </SessionContextProvider>
    </ThemeProvider>
  )
}
