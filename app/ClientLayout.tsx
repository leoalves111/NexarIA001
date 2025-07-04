"use client"

import type React from "react"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { AuthProvider } from "@/hooks/useAuth"
import { useState } from "react"
import type { Database } from "@/types/database"
import { supabase } from "@/lib/supabase"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionContextProvider supabaseClient={supabase} initialSession={null}>
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </SessionContextProvider>
  )
}
